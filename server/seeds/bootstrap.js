// seeds/bootstrap.js
// Auto-seed roles, departments, and default super_admin on first boot.
const Role       = require("../models/Role");
const Department = require("../models/Department");
const User       = require("../models/User");
const { ROLE_LEVELS } = require("../config/roles");
const { nextSequence } = require("../models/Counter");

const SYSTEM_ROLES = [
  { slug: "super_admin",          displayName: "Super Admin",          level: 10, isSystem: true },
  { slug: "admin",                displayName: "Admin",                level: 9,  isSystem: true },
  { slug: "project_manager",      displayName: "Project Manager",      level: 8,  isSystem: true },
  { slug: "dept_head",            displayName: "Department Head",       level: 7,  isSystem: true },
  { slug: "account_manager",      displayName: "Account Manager",      level: 6,  isSystem: true },
  { slug: "social_media_manager", displayName: "Social Media Manager", level: 5,  department: "social_media" },
  { slug: "graphic_designer",     displayName: "Graphic Designer",     level: 5,  department: "design" },
  { slug: "video_editor",         displayName: "Video Editor",         level: 5,  department: "video" },
  { slug: "cinematographer",      displayName: "Cinematographer",      level: 5,  department: "video" },
  { slug: "content_writer",       displayName: "Content Writer",       level: 5,  department: "content" },
  { slug: "web_developer",        displayName: "Web Developer",        level: 5,  department: "development" },
  { slug: "employee",             displayName: "Employee",             level: 4,  isSystem: true },
  { slug: "client",               displayName: "Client",               level: 1,  isSystem: true },
];

const SYSTEM_DEPARTMENTS = [
  { slug: "social_media",  displayName: "Social Media" },
  { slug: "design",        displayName: "Design & Creative" },
  { slug: "video",         displayName: "Video Production" },
  { slug: "content",       displayName: "Content & Copy" },
  { slug: "development",   displayName: "Web Development" },
  { slug: "marketing",     displayName: "Digital Marketing" },
  { slug: "management",    displayName: "Management" },
];

async function bootstrap() {
  // Seed roles
  for (const role of SYSTEM_ROLES) {
    await Role.findOneAndUpdate(
      { slug: role.slug },
      { $setOnInsert: role },
      { upsert: true, new: true }
    );
  }
  console.log(`✅ ${SYSTEM_ROLES.length} roles verified/seeded`);

  // Seed departments
  for (const dept of SYSTEM_DEPARTMENTS) {
    await Department.findOneAndUpdate(
      { slug: dept.slug },
      { $setOnInsert: dept },
      { upsert: true, new: true }
    );
  }
  console.log(`✅ ${SYSTEM_DEPARTMENTS.length} departments verified/seeded`);

  // Seed default super_admin if no users exist
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    const seq = await nextSequence("user");
    const admin = await User.create({
      userId: `ZRC-USR-${String(seq).padStart(5, "0")}`,
      name: "Archis Dutta",
      email: "admin@zrcmedia.in",
      password: "admin123",   // Change this immediately!
      role: "super_admin",
      roleLevel: 10,
      isActive: true,
    });
    console.log(`✅ Default super_admin created: ${admin.email} (password: admin123)`);
  }
}

module.exports = { bootstrap };
