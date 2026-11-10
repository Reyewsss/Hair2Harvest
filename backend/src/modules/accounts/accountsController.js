import mongoose from "mongoose";
import { User } from "../auth/authModel.js";
import { ROLES } from "../auth/utils/permissions.js";
import { EMAIL_RE, validatePassword } from "../auth/utils/passwordPolicy.js";
import { recordAudit } from "../audit/auditController.js";

const clean = (value) => String(value ?? "").trim();

const anotherAdminExists = async (excludeId) =>
  (await User.countDocuments({ role: "admin", isActive: true, _id: { $ne: excludeId } })) > 0;

const findTarget = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ message: "Account not found." });
    return null;
  }
  const user = await User.findById(req.params.id);
  if (!user) res.status(404).json({ message: "Account not found." });
  return user;
};

export const listAccounts = async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ accounts: users.map((u) => u.toSafeJSON()) });
};

export const createAccount = async (req, res) => {
  const name = clean(req.body?.name);
  const email = clean(req.body?.email).toLowerCase();
  const { role, password } = req.body ?? {};

  if (!name) return res.status(400).json({ message: "Enter a name." });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ message: "Enter a valid email address." });
  if (!ROLES.includes(role)) return res.status(400).json({ message: "Choose a role." });
  const problem = validatePassword(password);
  if (problem) return res.status(400).json({ message: problem });
  if (await User.exists({ email })) {
    return res.status(409).json({ message: "An account with this email already exists." });
  }

  const user = await User.create({
    name,
    email,
    role,
    password,
    createdBy: req.user.id,
  });

  await recordAudit({
    req,
    action: "create",
    module: "accounts",
    item: `${user.name} (${user.email})`,
    itemId: user._id.toString(),
    remarks: `Created ${role} account`,
  });

  res.status(201).json({ account: user.toSafeJSON() });
};

export const updateAccount = async (req, res) => {
  const user = await findTarget(req, res);
  if (!user) return;

  const { name, role, isActive, password } = req.body ?? {};
  const isSelf = user.id === req.user.id;
  let invalidateSessions = false;
  const changes = [];

  if (name !== undefined) {
    if (!clean(name)) return res.status(400).json({ message: "Enter a name." });
    if (user.name !== clean(name)) changes.push(`name: ${user.name} → ${clean(name)}`);
    user.name = clean(name);
  }

  if (role !== undefined && role !== user.role) {
    if (!ROLES.includes(role)) return res.status(400).json({ message: "Choose a valid role." });
    if (isSelf) return res.status(400).json({ message: "You can't change your own role." });
    if (user.role === "admin" && !(await anotherAdminExists(user.id))) {
      return res.status(400).json({ message: "There must be at least one active administrator." });
    }
    changes.push(`role: ${user.role} → ${role}`);
    user.role = role;
    invalidateSessions = true;
  }

  if (isActive !== undefined && Boolean(isActive) !== user.isActive) {
    if (!Boolean(isActive)) {
      if (isSelf) return res.status(400).json({ message: "You can't deactivate your own account." });
      if (user.role === "admin" && !(await anotherAdminExists(user.id))) {
        return res.status(400).json({ message: "There must be at least one active administrator." });
      }
    }
    changes.push(Boolean(isActive) ? "account activated" : "account deactivated");
    user.isActive = Boolean(isActive);
    invalidateSessions = true;
  }

  if (password !== undefined) {
    const problem = validatePassword(password);
    if (problem) return res.status(400).json({ message: problem });
    user.password = password;
    invalidateSessions = true;
    changes.push("password changed by admin");
  }

  if (invalidateSessions && !isSelf) user.tokenVersion += 1;
  await user.save();

  if (changes.length > 0) {
    await recordAudit({
      req,
      action: "update",
      module: "accounts",
      item: `${user.name} (${user.email})`,
      itemId: user._id.toString(),
      remarks: changes.join(", "),
    });
  }

  res.json({ account: user.toSafeJSON() });
};

export const deleteAccount = async (req, res) => {
  const user = await findTarget(req, res);
  if (!user) return;
  if (user.id === req.user.id) {
    return res.status(400).json({ message: "You can't delete your own account." });
  }
  if (user.role === "admin" && !(await anotherAdminExists(user.id))) {
    return res.status(400).json({ message: "There must be at least one active administrator." });
  }

  const snapshot = { name: user.name, email: user.email, id: user._id.toString() };
  await user.deleteOne();

  await recordAudit({
    req,
    action: "delete",
    module: "accounts",
    item: `${snapshot.name} (${snapshot.email})`,
    itemId: snapshot.id,
    remarks: "Account deleted",
  });

  res.json({ message: "Account deleted." });
};

export const listStaff = async (_req, res) => {
  try {
    const users = await User.find({ 
      role: { $in: [ "staff"] }, 
      isActive: true 
    }).sort({ name: 1 });
    res.json({ staff: users.map((u) => ({ id: u._id, name: u.name, role: u.role })) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};