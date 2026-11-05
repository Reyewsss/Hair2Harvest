import mongoose from "mongoose";
import { User } from "../auth/authModel.js";
import { ROLES } from "../auth/utils/permissions.js";
import { EMAIL_RE, validatePassword } from "../auth/utils/passwordPolicy.js";

const clean = (value) => String(value ?? "").trim();

// True when at least one other active admin remains, so the system can't lock itself out.
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
  if (await User.exists({ email })) return res.status(409).json({ message: "An account with this email already exists." });

  const user = await User.create({ name, email, role, password, createdBy: req.user.id });
  res.status(201).json({ account: user.toSafeJSON() });
};

/** PATCH /accounts/:id  { name?, role?, isActive?, password? } */
export const updateAccount = async (req, res) => {
  const user = await findTarget(req, res);
  if (!user) return;

  const { name, role, isActive, password } = req.body ?? {};
  const isSelf = user.id === req.user.id;
  let invalidateSessions = false;

  if (name !== undefined) {
    if (!clean(name)) return res.status(400).json({ message: "Enter a name." });
    user.name = clean(name);
  }

  if (role !== undefined && role !== user.role) {
    if (!ROLES.includes(role)) return res.status(400).json({ message: "Choose a valid role." });
    if (isSelf) return res.status(400).json({ message: "You can't change your own role." });
    if (user.role === "admin" && !(await anotherAdminExists(user.id))) {
      return res.status(400).json({ message: "There must be at least one active administrator." });
    }
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
    user.isActive = Boolean(isActive);
    invalidateSessions = true;
  }

  if (password !== undefined) {
    const problem = validatePassword(password);
    if (problem) return res.status(400).json({ message: problem });
    user.password = password;
    invalidateSessions = true;
  }

  // The admin editing their own name/password keeps their session; everything else signs the target out.
  if (invalidateSessions && !isSelf) user.tokenVersion += 1;
  await user.save();
  res.json({ account: user.toSafeJSON() });
};

export const deleteAccount = async (req, res) => {
  const user = await findTarget(req, res);
  if (!user) return;
  if (user.id === req.user.id) return res.status(400).json({ message: "You can't delete your own account." });
  if (user.role === "admin" && !(await anotherAdminExists(user.id))) {
    return res.status(400).json({ message: "There must be at least one active administrator." });
  }
  await user.deleteOne();
  res.json({ message: "Account deleted." });
};