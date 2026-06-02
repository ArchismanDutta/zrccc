// seeds/seedAll.js
// Comprehensive seed script — populates the entire DB with realistic ZRC data.
// Run: node seeds/seedAll.js
require("dotenv").config();
const mongoose = require("mongoose");
const { MONGODB_URI } = require("../config/env");
const { ROLE_LEVELS } = require("../config/roles");

// Models
const User         = require("../models/User");
const Client       = require("../models/Client");
const Project      = require("../models/Project");
const Task         = require("../models/Task");
const ContentItem  = require("../models/ContentItem");
const Invoice      = require("../models/Invoice");
const Payment      = require("../models/Payment");
const Notification = require("../models/Notification");
const AuditLog     = require("../models/AuditLog");
const Role         = require("../models/Role");
const Department   = require("../models/Department");
const { Counter }  = require("../models/Counter");

// ═══════════════════════════════════════════════════════════════
// USERS — 12 profiles covering every role
// ═══════════════════════════════════════════════════════════════
const USERS = [
  // Admins / Owners
  { userId: "ZRC-USR-00001", name: "Archis Dutta",      email: "archis@zrcmedia.in",   password: "admin123",    role: "super_admin",          roleLevel: 10 },
  { userId: "ZRC-USR-00002", name: "Rohan Mehta",       email: "rohan@zrcmedia.in",    password: "admin123",    role: "super_admin",          roleLevel: 10 },
  { userId: "ZRC-USR-00003", name: "Sanya Kapoor",      email: "sanya@zrcmedia.in",    password: "admin123",    role: "admin",                roleLevel: 9 },
  // Project Manager
  { userId: "ZRC-USR-00004", name: "Rahul Khanna",      email: "rahul@zrcmedia.in",    password: "test1234",    role: "project_manager",      roleLevel: 8 },
  // Account Manager
  { userId: "ZRC-USR-00005", name: "Priya Malhotra",    email: "priya@zrcmedia.in",    password: "test1234",    role: "account_manager",      roleLevel: 6 },
  // Social Media Manager
  { userId: "ZRC-USR-00006", name: "Neha Verma",        email: "neha@zrcmedia.in",     password: "test1234",    role: "social_media_manager", roleLevel: 5 },
  // Graphic Designer
  { userId: "ZRC-USR-00007", name: "Aditya Singh",      email: "aditya@zrcmedia.in",   password: "test1234",    role: "graphic_designer",     roleLevel: 5 },
  // Video Editor
  { userId: "ZRC-USR-00008", name: "Kavya Nair",        email: "kavya@zrcmedia.in",    password: "test1234",    role: "video_editor",         roleLevel: 5 },
  // Cinematographer
  { userId: "ZRC-USR-00009", name: "Vijay Chauhan",     email: "vijay@zrcmedia.in",    password: "test1234",    role: "cinematographer",      roleLevel: 5 },
  // Content Writer
  { userId: "ZRC-USR-00010", name: "Ishita Sharma",     email: "ishita@zrcmedia.in",   password: "test1234",    role: "content_writer",       roleLevel: 5 },
  // Web Developer
  { userId: "ZRC-USR-00011", name: "Dev Patel",         email: "dev@zrcmedia.in",      password: "test1234",    role: "web_developer",        roleLevel: 5 },
  // Employee
  { userId: "ZRC-USR-00012", name: "Ananya Gupta",      email: "ananya@zrcmedia.in",   password: "test1234",    role: "employee",             roleLevel: 4 },
];

// ═══════════════════════════════════════════════════════════════
// CLIENTS — 8 realistic clients
// ═══════════════════════════════════════════════════════════════
function buildClients(userMap) {
  return [
    {
      clientId: "ZRC-CLT-00001", companyName: "StyleHub Pvt Ltd", displayName: "StyleHub",
      contactName: "Shruti Kapoor", contactEmail: "shruti@stylehub.in", contactPhone: "+91 98765 43210",
      website: "https://stylehub.in", industry: "Fashion & Lifestyle", region: "north_india",
      gstNumber: "07AAACS1234A1Z5", billingAddress: "A-12, Connaught Place, New Delhi 110001",
      services: ["social_media_management", "reels", "graphics", "carousels"],
      contract: { monthlyValue: 45000, currency: "INR", billingCycle: "monthly", startDate: new Date("2026-01-15"), endDate: new Date("2026-12-31"), autoRenew: true },
      status: "active", priority: "vip", healthScore: 92,
      accountManagerId: userMap["priya@zrcmedia.in"],
      enteredBy: userMap["archis@zrcmedia.in"],
      statusHistory: [{ to: "prospect", changedBy: userMap["archis@zrcmedia.in"], changedAt: new Date("2025-12-01") }, { from: "prospect", to: "onboarding", changedBy: userMap["priya@zrcmedia.in"], changedAt: new Date("2026-01-05") }, { from: "onboarding", to: "active", changedBy: userMap["priya@zrcmedia.in"], changedAt: new Date("2026-01-15") }],
      tags: ["fashion", "premium", "instagram-focus"],
      lastContactedAt: new Date("2026-05-25"), nextFollowUpAt: new Date("2026-06-01"),
    },
    {
      clientId: "ZRC-CLT-00002", companyName: "Nexus Technologies", displayName: "NexusTech",
      contactName: "Varun Mehta", contactEmail: "varun@nexustech.io", contactPhone: "+91 87654 32109",
      website: "https://nexustech.io", industry: "Technology & SaaS", region: "west_india",
      gstNumber: "27AABCN5678B2Z3", billingAddress: "403, Techpark, BKC, Mumbai 400051",
      services: ["website_development", "meta_ads"],
      contract: { monthlyValue: 65000, currency: "INR", billingCycle: "monthly", startDate: new Date("2026-03-01"), endDate: new Date("2026-09-30") },
      status: "active", priority: "high", healthScore: 78,
      accountManagerId: userMap["priya@zrcmedia.in"],
      enteredBy: userMap["rohan@zrcmedia.in"],
      statusHistory: [{ to: "prospect", changedBy: userMap["rohan@zrcmedia.in"], changedAt: new Date("2026-02-10") }, { from: "prospect", to: "active", changedBy: userMap["priya@zrcmedia.in"], changedAt: new Date("2026-03-01") }],
      tags: ["tech", "website", "ads"],
      lastContactedAt: new Date("2026-05-20"),
    },
    {
      clientId: "ZRC-CLT-00003", companyName: "FoodieBox India", displayName: "FoodieBox",
      contactName: "Anjali Singh", contactEmail: "anjali@foodiebox.in", contactPhone: "+91 76543 21098",
      website: "https://foodiebox.in", industry: "Food & Beverage", region: "north_india",
      services: ["meta_ads", "graphics", "carousels", "reels"],
      contract: { monthlyValue: 35000, currency: "INR", billingCycle: "monthly", startDate: new Date("2026-02-01"), endDate: new Date("2027-01-31"), autoRenew: true },
      status: "active", priority: "high", healthScore: 85,
      accountManagerId: userMap["priya@zrcmedia.in"],
      enteredBy: userMap["archis@zrcmedia.in"],
      statusHistory: [{ to: "prospect", changedBy: userMap["archis@zrcmedia.in"], changedAt: new Date("2026-01-10") }, { from: "prospect", to: "active", changedBy: userMap["priya@zrcmedia.in"], changedAt: new Date("2026-02-01") }],
      tags: ["food", "d2c", "meta-ads"],
    },
    {
      clientId: "ZRC-CLT-00004", companyName: "LuxeHomes Realty", displayName: "LuxeHomes",
      contactName: "Rohit Sharma", contactEmail: "rohit@luxehomes.com", contactPhone: "+91 65432 10987",
      website: "https://luxehomes.com", industry: "Real Estate", region: "north_india",
      services: ["carousels", "video_production", "reels", "photography"],
      contract: { monthlyValue: 52000, currency: "INR", billingCycle: "monthly", startDate: new Date("2026-03-15"), endDate: new Date("2026-12-31") },
      status: "active", priority: "medium", healthScore: 73,
      accountManagerId: userMap["priya@zrcmedia.in"],
      enteredBy: userMap["sanya@zrcmedia.in"],
      statusHistory: [{ to: "prospect", changedBy: userMap["sanya@zrcmedia.in"], changedAt: new Date("2026-02-20") }, { from: "prospect", to: "active", changedBy: userMap["priya@zrcmedia.in"], changedAt: new Date("2026-03-15") }],
      tags: ["real-estate", "luxury", "video"],
    },
    {
      clientId: "ZRC-CLT-00005", companyName: "PureHealth Wellness", displayName: "PureHealth",
      contactName: "Deepika Nair", contactEmail: "deepika@purehealth.in", contactPhone: "+91 54321 09876",
      website: "https://purehealth.in", industry: "Health & Wellness", region: "south_india",
      services: ["social_media_management", "content_writing", "graphics"],
      contract: { monthlyValue: 28000, currency: "INR", billingCycle: "monthly", startDate: new Date("2026-05-01"), endDate: new Date("2027-04-30") },
      status: "onboarding", priority: "medium", healthScore: 90,
      accountManagerId: userMap["priya@zrcmedia.in"],
      enteredBy: userMap["rohan@zrcmedia.in"],
      statusHistory: [{ to: "prospect", changedBy: userMap["rohan@zrcmedia.in"], changedAt: new Date("2026-04-15") }, { from: "prospect", to: "onboarding", changedBy: userMap["priya@zrcmedia.in"], changedAt: new Date("2026-05-01") }],
      tags: ["health", "wellness", "content"],
    },
    {
      clientId: "ZRC-CLT-00006", companyName: "TechCraft Solutions", displayName: "TechCraft",
      contactName: "Arjun Patel", contactEmail: "arjun@techcraft.co", contactPhone: "+91 43210 98765",
      website: "https://techcraft.co", industry: "IT Services", region: "west_india",
      services: ["website_development", "website_maintenance"],
      contract: { monthlyValue: 40000, currency: "INR", billingCycle: "monthly", startDate: new Date("2025-09-01"), endDate: new Date("2026-08-31") },
      status: "paused", priority: "low", healthScore: 45,
      accountManagerId: userMap["priya@zrcmedia.in"],
      enteredBy: userMap["archis@zrcmedia.in"],
      statusHistory: [{ to: "active", changedBy: userMap["archis@zrcmedia.in"], changedAt: new Date("2025-09-01") }, { from: "active", to: "paused", changedBy: userMap["priya@zrcmedia.in"], reason: "Client requested pause — budget freeze", changedAt: new Date("2026-04-01") }],
      tags: ["tech", "website"],
      notes: "Client has paused due to internal budget review. Follow up in June.",
    },
    {
      clientId: "ZRC-CLT-00007", companyName: "GreenLeaf Organics", displayName: "GreenLeaf",
      contactName: "Meera Iyer", contactEmail: "meera@greenleaf.org", contactPhone: "+91 32109 87654",
      website: "https://greenleaf.org", industry: "Organic Products", region: "south_india",
      services: ["social_media_management", "reels", "meta_ads", "content_writing"],
      contract: { monthlyValue: 38000, currency: "INR", billingCycle: "monthly", startDate: new Date("2026-04-01"), endDate: new Date("2027-03-31") },
      status: "active", priority: "high", healthScore: 88,
      accountManagerId: userMap["priya@zrcmedia.in"],
      enteredBy: userMap["sanya@zrcmedia.in"],
      statusHistory: [{ to: "prospect", changedBy: userMap["sanya@zrcmedia.in"], changedAt: new Date("2026-03-10") }, { from: "prospect", to: "active", changedBy: userMap["priya@zrcmedia.in"], changedAt: new Date("2026-04-01") }],
      tags: ["organic", "eco", "sustainability"],
    },
    {
      clientId: "ZRC-CLT-00008", companyName: "UrbanFit Gym Chain", displayName: "UrbanFit",
      contactName: "Karan Gill", contactEmail: "karan@urbanfit.in", contactPhone: "+91 21098 76543",
      website: "https://urbanfit.in", industry: "Fitness", region: "north_india",
      services: ["reels", "video_production", "meta_ads", "photography", "graphics"],
      contract: { monthlyValue: 55000, currency: "INR", billingCycle: "monthly", startDate: new Date("2026-05-01"), endDate: new Date("2027-04-30") },
      status: "active", priority: "vip", healthScore: 95,
      accountManagerId: userMap["priya@zrcmedia.in"],
      enteredBy: userMap["archis@zrcmedia.in"],
      statusHistory: [{ to: "prospect", changedBy: userMap["archis@zrcmedia.in"], changedAt: new Date("2026-04-01") }, { from: "prospect", to: "active", changedBy: userMap["priya@zrcmedia.in"], changedAt: new Date("2026-05-01") }],
      tags: ["fitness", "gym", "reels-heavy", "vip"],
    },
  ];
}

// ═══════════════════════════════════════════════════════════════
// PROJECTS
// ═══════════════════════════════════════════════════════════════
function buildProjects(userMap, clientMap) {
  const u = userMap, c = clientMap;
  return [
    {
      projectId: "ZRC-PRJ-00001", name: "StyleHub Social Media Q2", description: "Full social media management for StyleHub — Instagram & Facebook. Includes 12 static posts, 4 carousels, 4 reels per month.",
      type: ["social_media_management", "reels", "graphics", "carousels"], clientId: c["StyleHub"], projectManagerId: u["rahul@zrcmedia.in"],
      status: "active", priority: "high", startDate: new Date("2026-04-01"), endDate: new Date("2026-06-30"), overallProgress: 72, budget: 135000,
      teamMembers: [
        { userId: u["rahul@zrcmedia.in"], projectRole: "Project Manager" },
        { userId: u["neha@zrcmedia.in"], projectRole: "Social Media Lead" },
        { userId: u["aditya@zrcmedia.in"], projectRole: "Graphic Designer" },
        { userId: u["kavya@zrcmedia.in"], projectRole: "Reel Editor" },
        { userId: u["ishita@zrcmedia.in"], projectRole: "Caption Writer" },
      ],
      milestones: [
        { title: "April batch delivered", isCompleted: true, completedAt: new Date("2026-04-28") },
        { title: "May batch delivered", isCompleted: true, completedAt: new Date("2026-05-26") },
        { title: "June batch delivered", dueDate: new Date("2026-06-28"), isCompleted: false },
      ],
      statusHistory: [{ to: "planning", changedBy: u["rahul@zrcmedia.in"], changedAt: new Date("2026-03-25") }, { from: "planning", to: "active", changedBy: u["rahul@zrcmedia.in"], changedAt: new Date("2026-04-01") }],
      createdBy: u["archis@zrcmedia.in"],
    },
    {
      projectId: "ZRC-PRJ-00002", name: "NexusTech Corporate Website", description: "Complete website redesign and development for NexusTech. React/Next.js frontend with headless CMS.",
      type: ["website_development"], clientId: c["NexusTech"], projectManagerId: u["priya@zrcmedia.in"],
      status: "active", priority: "high", startDate: new Date("2026-05-01"), endDate: new Date("2026-07-15"), overallProgress: 38, budget: 195000,
      teamMembers: [
        { userId: u["priya@zrcmedia.in"], projectRole: "Project Manager" },
        { userId: u["dev@zrcmedia.in"], projectRole: "Lead Developer" },
        { userId: u["aditya@zrcmedia.in"], projectRole: "UI Designer" },
      ],
      milestones: [
        { title: "Wireframes & design approved", isCompleted: true, completedAt: new Date("2026-05-15") },
        { title: "Frontend build — Phase 1", dueDate: new Date("2026-06-10"), isCompleted: false },
        { title: "Backend integration", dueDate: new Date("2026-06-25"), isCompleted: false },
        { title: "Testing & launch", dueDate: new Date("2026-07-15"), isCompleted: false },
      ],
      statusHistory: [{ to: "planning", changedBy: u["priya@zrcmedia.in"], changedAt: new Date("2026-04-20") }, { from: "planning", to: "active", changedBy: u["priya@zrcmedia.in"], changedAt: new Date("2026-05-01") }],
      createdBy: u["rohan@zrcmedia.in"],
    },
    {
      projectId: "ZRC-PRJ-00003", name: "FoodieBox Meta Ads & Creatives", description: "Monthly Meta Ads management + creative production for FoodieBox. Covers ad strategy, creatives, A/B testing, and performance reports.",
      type: ["meta_ads", "graphics", "carousels"], clientId: c["FoodieBox"], projectManagerId: u["rahul@zrcmedia.in"],
      status: "active", priority: "urgent", startDate: new Date("2026-03-15"), endDate: new Date("2026-06-01"), overallProgress: 85, budget: 105000,
      teamMembers: [
        { userId: u["rahul@zrcmedia.in"], projectRole: "Project Manager & Ads Lead" },
        { userId: u["aditya@zrcmedia.in"], projectRole: "Creative Designer" },
        { userId: u["ishita@zrcmedia.in"], projectRole: "Ad Copywriter" },
      ],
      milestones: [
        { title: "March campaign launched", isCompleted: true, completedAt: new Date("2026-03-20") },
        { title: "April campaign — A/B test results", isCompleted: true, completedAt: new Date("2026-04-15") },
        { title: "May campaign wrap-up", dueDate: new Date("2026-05-31"), isCompleted: false },
      ],
      createdBy: u["archis@zrcmedia.in"],
    },
    {
      projectId: "ZRC-PRJ-00004", name: "LuxeHomes Branding & Video", description: "Premium video production and carousel content for LuxeHomes luxury properties.",
      type: ["carousels", "video_production", "reels", "photography"], clientId: c["LuxeHomes"], projectManagerId: u["rahul@zrcmedia.in"],
      status: "active", priority: "medium", startDate: new Date("2026-04-15"), endDate: new Date("2026-06-18"), overallProgress: 51, budget: 156000,
      teamMembers: [
        { userId: u["rahul@zrcmedia.in"], projectRole: "Project Manager" },
        { userId: u["vijay@zrcmedia.in"], projectRole: "Cinematographer" },
        { userId: u["kavya@zrcmedia.in"], projectRole: "Video Editor" },
        { userId: u["aditya@zrcmedia.in"], projectRole: "Carousel Designer" },
      ],
      createdBy: u["sanya@zrcmedia.in"],
    },
    {
      projectId: "ZRC-PRJ-00005", name: "PureHealth Social Onboarding", description: "Initial social media setup and content strategy for PureHealth Wellness.",
      type: ["social_media_management", "content_writing", "graphics"], clientId: c["PureHealth"], projectManagerId: u["priya@zrcmedia.in"],
      status: "planning", priority: "medium", startDate: new Date("2026-05-20"), endDate: new Date("2026-08-20"), overallProgress: 8, budget: 84000,
      teamMembers: [
        { userId: u["priya@zrcmedia.in"], projectRole: "Project Manager" },
        { userId: u["neha@zrcmedia.in"], projectRole: "Social Media Lead" },
        { userId: u["ishita@zrcmedia.in"], projectRole: "Content Writer" },
      ],
      createdBy: u["rohan@zrcmedia.in"],
    },
    {
      projectId: "ZRC-PRJ-00006", name: "GreenLeaf Full Digital", description: "Complete digital marketing — social media, reels, Meta ads, and blog content.",
      type: ["social_media_management", "reels", "meta_ads", "content_writing"], clientId: c["GreenLeaf"], projectManagerId: u["rahul@zrcmedia.in"],
      status: "active", priority: "high", startDate: new Date("2026-04-01"), endDate: new Date("2026-09-30"), overallProgress: 35, budget: 228000,
      teamMembers: [
        { userId: u["rahul@zrcmedia.in"], projectRole: "Project Manager" },
        { userId: u["neha@zrcmedia.in"], projectRole: "Social Media Manager" },
        { userId: u["kavya@zrcmedia.in"], projectRole: "Reel Editor" },
        { userId: u["ishita@zrcmedia.in"], projectRole: "Content Writer" },
        { userId: u["aditya@zrcmedia.in"], projectRole: "Designer" },
      ],
      createdBy: u["sanya@zrcmedia.in"],
    },
    {
      projectId: "ZRC-PRJ-00007", name: "UrbanFit Launch Campaign", description: "High-energy launch campaign — reels, gym shoot videos, Meta ads, and influencer collaborations.",
      type: ["reels", "video_production", "meta_ads", "photography", "graphics"], clientId: c["UrbanFit"], projectManagerId: u["rahul@zrcmedia.in"],
      status: "active", priority: "critical", startDate: new Date("2026-05-01"), endDate: new Date("2026-07-31"), overallProgress: 22, budget: 330000,
      teamMembers: [
        { userId: u["rahul@zrcmedia.in"], projectRole: "Project Manager" },
        { userId: u["vijay@zrcmedia.in"], projectRole: "Lead Cinematographer" },
        { userId: u["kavya@zrcmedia.in"], projectRole: "Video Editor" },
        { userId: u["aditya@zrcmedia.in"], projectRole: "Creative Director" },
        { userId: u["neha@zrcmedia.in"], projectRole: "Social Media Manager" },
        { userId: u["ishita@zrcmedia.in"], projectRole: "Copywriter" },
      ],
      createdBy: u["archis@zrcmedia.in"],
    },
  ];
}

// ═══════════════════════════════════════════════════════════════
// TASKS — 25 tasks spanning every category
// ═══════════════════════════════════════════════════════════════
function buildTasks(userMap, projectMap) {
  const u = userMap, p = projectMap;
  return [
    { taskId: "ZRC-TSK-00001", title: "Shoot FoodieBox Product Reel — Summer Menu", category: "shooting", projectId: p["ZRC-PRJ-00003"], assignedTo: [u["vijay@zrcmedia.in"]], assignedBy: u["rahul@zrcmedia.in"], status: "in_progress", priority: "urgent", dueDate: new Date("2026-05-29"), estimatedHours: 4, createdBy: u["rahul@zrcmedia.in"] },
    { taskId: "ZRC-TSK-00002", title: "Edit NexusTech Brand Intro Video", category: "video_editing", projectId: p["ZRC-PRJ-00002"], assignedTo: [u["kavya@zrcmedia.in"]], assignedBy: u["priya@zrcmedia.in"], status: "todo", priority: "high", dueDate: new Date("2026-05-30"), estimatedHours: 6, createdBy: u["priya@zrcmedia.in"] },
    { taskId: "ZRC-TSK-00003", title: "Design StyleHub June Static Batch (12 posts)", category: "graphic_design", projectId: p["ZRC-PRJ-00001"], assignedTo: [u["aditya@zrcmedia.in"]], assignedBy: u["rahul@zrcmedia.in"], status: "in_progress", priority: "high", dueDate: new Date("2026-05-31"), estimatedHours: 10, startedAt: new Date("2026-05-26"), createdBy: u["rahul@zrcmedia.in"] },
    { taskId: "ZRC-TSK-00004", title: "Write captions — LuxeHomes June batch", category: "caption_writing", projectId: p["ZRC-PRJ-00004"], assignedTo: [u["ishita@zrcmedia.in"]], assignedBy: u["rahul@zrcmedia.in"], status: "review", priority: "medium", dueDate: new Date("2026-06-01"), estimatedHours: 3, createdBy: u["rahul@zrcmedia.in"] },
    { taskId: "ZRC-TSK-00005", title: "Setup FoodieBox May Ad Campaign", category: "meta_ads_management", projectId: p["ZRC-PRJ-00003"], assignedTo: [u["rahul@zrcmedia.in"]], assignedBy: u["archis@zrcmedia.in"], status: "todo", priority: "high", dueDate: new Date("2026-06-01"), estimatedHours: 4, createdBy: u["archis@zrcmedia.in"] },
    { taskId: "ZRC-TSK-00006", title: "Build NexusTech Contact Page", category: "web_development", projectId: p["ZRC-PRJ-00002"], assignedTo: [u["dev@zrcmedia.in"]], assignedBy: u["priya@zrcmedia.in"], status: "in_progress", priority: "medium", dueDate: new Date("2026-06-03"), estimatedHours: 8, startedAt: new Date("2026-05-27"), createdBy: u["priya@zrcmedia.in"] },
    { taskId: "ZRC-TSK-00007", title: "Design LuxeHomes Carousel #3 — Villa Showcase", category: "carousel_design", projectId: p["ZRC-PRJ-00004"], assignedTo: [u["aditya@zrcmedia.in"]], assignedBy: u["rahul@zrcmedia.in"], status: "revision_needed", priority: "high", dueDate: new Date("2026-06-02"), estimatedHours: 5, createdBy: u["rahul@zrcmedia.in"], reviewNote: "Fonts don't match brand guidelines. Use Playfair Display for headings." },
    { taskId: "ZRC-TSK-00008", title: "Plan StyleHub July Content Calendar", category: "content_planning", projectId: p["ZRC-PRJ-00001"], assignedTo: [u["neha@zrcmedia.in"]], assignedBy: u["rahul@zrcmedia.in"], status: "todo", priority: "medium", dueDate: new Date("2026-06-10"), estimatedHours: 3, createdBy: u["rahul@zrcmedia.in"] },
    { taskId: "ZRC-TSK-00009", title: "Prepare May Client Performance Reports — All", category: "client_report", projectId: null, assignedTo: [u["priya@zrcmedia.in"]], assignedBy: u["archis@zrcmedia.in"], status: "todo", priority: "high", dueDate: new Date("2026-06-05"), estimatedHours: 6, createdBy: u["archis@zrcmedia.in"] },
    { taskId: "ZRC-TSK-00010", title: "StyleHub Reel #3 — Summer Collection BTS", category: "reel_editing", projectId: p["ZRC-PRJ-00001"], assignedTo: [u["kavya@zrcmedia.in"]], assignedBy: u["rahul@zrcmedia.in"], status: "done", priority: "medium", dueDate: new Date("2026-05-28"), completedAt: new Date("2026-05-27"), actualHours: 3, createdBy: u["rahul@zrcmedia.in"] },
    { taskId: "ZRC-TSK-00011", title: "GreenLeaf Instagram Reels — Organic Farm Tour", category: "shooting", projectId: p["ZRC-PRJ-00006"], assignedTo: [u["vijay@zrcmedia.in"]], assignedBy: u["rahul@zrcmedia.in"], status: "todo", priority: "high", dueDate: new Date("2026-06-05"), estimatedHours: 5, createdBy: u["rahul@zrcmedia.in"] },
    { taskId: "ZRC-TSK-00012", title: "GreenLeaf Blog Post — '5 Benefits of Cold-Pressed Oils'", category: "caption_writing", projectId: p["ZRC-PRJ-00006"], assignedTo: [u["ishita@zrcmedia.in"]], assignedBy: u["neha@zrcmedia.in"], status: "in_progress", priority: "medium", dueDate: new Date("2026-06-04"), estimatedHours: 4, startedAt: new Date("2026-05-27"), createdBy: u["neha@zrcmedia.in"] },
    { taskId: "ZRC-TSK-00013", title: "UrbanFit Gym Shoot — Launch Video", category: "shooting", projectId: p["ZRC-PRJ-00007"], assignedTo: [u["vijay@zrcmedia.in"]], assignedBy: u["rahul@zrcmedia.in"], status: "todo", priority: "urgent", dueDate: new Date("2026-06-03"), estimatedHours: 8, createdBy: u["rahul@zrcmedia.in"] },
    { taskId: "ZRC-TSK-00014", title: "UrbanFit Meta Ad Creatives — Founding Member Offer", category: "meta_ad_creative", projectId: p["ZRC-PRJ-00007"], assignedTo: [u["aditya@zrcmedia.in"]], assignedBy: u["rahul@zrcmedia.in"], status: "todo", priority: "urgent", dueDate: new Date("2026-06-05"), estimatedHours: 6, createdBy: u["rahul@zrcmedia.in"] },
    { taskId: "ZRC-TSK-00015", title: "UrbanFit Ad Copy — 5 Variants", category: "caption_writing", projectId: p["ZRC-PRJ-00007"], assignedTo: [u["ishita@zrcmedia.in"]], assignedBy: u["rahul@zrcmedia.in"], status: "todo", priority: "high", dueDate: new Date("2026-06-04"), estimatedHours: 3, createdBy: u["rahul@zrcmedia.in"] },
    { taskId: "ZRC-TSK-00016", title: "StyleHub Carousel #4 — Monsoon Collection", category: "carousel_design", projectId: p["ZRC-PRJ-00001"], assignedTo: [u["aditya@zrcmedia.in"]], assignedBy: u["neha@zrcmedia.in"], status: "done", priority: "medium", dueDate: new Date("2026-05-25"), completedAt: new Date("2026-05-24"), actualHours: 4, createdBy: u["neha@zrcmedia.in"] },
    { taskId: "ZRC-TSK-00017", title: "FoodieBox Ad A/B Test Analysis — May", category: "meta_ads_management", projectId: p["ZRC-PRJ-00003"], assignedTo: [u["rahul@zrcmedia.in"]], assignedBy: u["archis@zrcmedia.in"], status: "in_progress", priority: "high", dueDate: new Date("2026-05-30"), startedAt: new Date("2026-05-28"), createdBy: u["archis@zrcmedia.in"] },
    { taskId: "ZRC-TSK-00018", title: "NexusTech Website — Hero Section Design", category: "graphic_design", projectId: p["ZRC-PRJ-00002"], assignedTo: [u["aditya@zrcmedia.in"]], assignedBy: u["priya@zrcmedia.in"], status: "done", priority: "high", dueDate: new Date("2026-05-15"), completedAt: new Date("2026-05-14"), actualHours: 5, createdBy: u["priya@zrcmedia.in"] },
    { taskId: "ZRC-TSK-00019", title: "LuxeHomes Property Tour Reel — Noida Villa", category: "reel_editing", projectId: p["ZRC-PRJ-00004"], assignedTo: [u["kavya@zrcmedia.in"]], assignedBy: u["rahul@zrcmedia.in"], status: "review", priority: "high", dueDate: new Date("2026-06-01"), estimatedHours: 5, createdBy: u["rahul@zrcmedia.in"] },
    { taskId: "ZRC-TSK-00020", title: "GreenLeaf June Social Calendar", category: "content_planning", projectId: p["ZRC-PRJ-00006"], assignedTo: [u["neha@zrcmedia.in"]], assignedBy: u["rahul@zrcmedia.in"], status: "done", priority: "medium", dueDate: new Date("2026-05-25"), completedAt: new Date("2026-05-23"), createdBy: u["rahul@zrcmedia.in"] },
    { taskId: "ZRC-TSK-00021", title: "NexusTech Website — Product Features Page", category: "web_development", projectId: p["ZRC-PRJ-00002"], assignedTo: [u["dev@zrcmedia.in"]], assignedBy: u["priya@zrcmedia.in"], status: "todo", priority: "medium", dueDate: new Date("2026-06-08"), estimatedHours: 10, createdBy: u["priya@zrcmedia.in"] },
    { taskId: "ZRC-TSK-00022", title: "UrbanFit Social Media Profiles Setup", category: "internal", projectId: p["ZRC-PRJ-00007"], assignedTo: [u["neha@zrcmedia.in"]], assignedBy: u["rahul@zrcmedia.in"], status: "done", priority: "high", dueDate: new Date("2026-05-20"), completedAt: new Date("2026-05-19"), createdBy: u["rahul@zrcmedia.in"] },
    { taskId: "ZRC-TSK-00023", title: "PureHealth Brand Audit & Competitor Analysis", category: "internal", projectId: p["ZRC-PRJ-00005"], assignedTo: [u["neha@zrcmedia.in"], u["ishita@zrcmedia.in"]], assignedBy: u["priya@zrcmedia.in"], status: "in_progress", priority: "medium", dueDate: new Date("2026-06-02"), estimatedHours: 8, startedAt: new Date("2026-05-26"), createdBy: u["priya@zrcmedia.in"] },
    { taskId: "ZRC-TSK-00024", title: "GreenLeaf Static Posts — Week 1 June", category: "graphic_design", projectId: p["ZRC-PRJ-00006"], assignedTo: [u["aditya@zrcmedia.in"]], assignedBy: u["neha@zrcmedia.in"], status: "todo", priority: "medium", dueDate: new Date("2026-06-06"), estimatedHours: 6, createdBy: u["neha@zrcmedia.in"] },
    { taskId: "ZRC-TSK-00025", title: "FoodieBox Reel — Chef's Special Recipe", category: "reel_editing", projectId: p["ZRC-PRJ-00003"], assignedTo: [u["kavya@zrcmedia.in"]], assignedBy: u["rahul@zrcmedia.in"], status: "done", priority: "medium", dueDate: new Date("2026-05-22"), completedAt: new Date("2026-05-21"), actualHours: 3, createdBy: u["rahul@zrcmedia.in"] },
  ];
}

// ═══════════════════════════════════════════════════════════════
// CONTENT ITEMS — 20 items across various types and statuses
// ═══════════════════════════════════════════════════════════════
function buildContent(userMap, projectMap, clientMap) {
  const u = userMap, p = projectMap, c = clientMap;
  return [
    { contentId: "ZRC-CON-00001", projectId: p["ZRC-PRJ-00001"], clientId: c["StyleHub"], title: "StyleHub Summer Reel #1 — Beach Vibes", contentType: "reel", platform: ["instagram"], status: "published", publishedAt: new Date("2026-05-05"), assignedTo: [u["kavya@zrcmedia.in"]], plannedMonth: "2026-05", weekNumber: 1, priority: "high", createdBy: u["neha@zrcmedia.in"] },
    { contentId: "ZRC-CON-00002", projectId: p["ZRC-PRJ-00001"], clientId: c["StyleHub"], title: "StyleHub Carousel — '5 Summer Must-Haves'", contentType: "carousel", platform: ["instagram", "facebook"], status: "published", publishedAt: new Date("2026-05-08"), assignedTo: [u["aditya@zrcmedia.in"]], plannedMonth: "2026-05", weekNumber: 2, createdBy: u["neha@zrcmedia.in"] },
    { contentId: "ZRC-CON-00003", projectId: p["ZRC-PRJ-00001"], clientId: c["StyleHub"], title: "StyleHub Static Posts — Week 3 May (4 posts)", contentType: "static_post", platform: ["instagram", "facebook"], status: "published", publishedAt: new Date("2026-05-18"), assignedTo: [u["aditya@zrcmedia.in"]], plannedMonth: "2026-05", weekNumber: 3, createdBy: u["neha@zrcmedia.in"] },
    { contentId: "ZRC-CON-00004", projectId: p["ZRC-PRJ-00001"], clientId: c["StyleHub"], title: "StyleHub Reel #2 — Behind The Scenes", contentType: "reel", platform: ["instagram"], status: "approved", assignedTo: [u["kavya@zrcmedia.in"]], plannedMonth: "2026-05", weekNumber: 4, priority: "high", reviewedBy: u["rahul@zrcmedia.in"], reviewedAt: new Date("2026-05-26"), createdBy: u["neha@zrcmedia.in"] },
    { contentId: "ZRC-CON-00005", projectId: p["ZRC-PRJ-00001"], clientId: c["StyleHub"], title: "StyleHub June Reel #1 — Monsoon Lookbook", contentType: "reel", platform: ["instagram"], status: "in_review", assignedTo: [u["kavya@zrcmedia.in"]], plannedMonth: "2026-06", weekNumber: 1, priority: "high", createdBy: u["neha@zrcmedia.in"] },
    { contentId: "ZRC-CON-00006", projectId: p["ZRC-PRJ-00003"], clientId: c["FoodieBox"], title: "FoodieBox Carousel — Summer Menu Highlights", contentType: "carousel", platform: ["instagram", "facebook"], status: "revision_needed", assignedTo: [u["aditya@zrcmedia.in"]], plannedMonth: "2026-05", weekNumber: 4, reviewNotes: "Client wants brighter colours and larger food photography", createdBy: u["rahul@zrcmedia.in"] },
    { contentId: "ZRC-CON-00007", projectId: p["ZRC-PRJ-00003"], clientId: c["FoodieBox"], title: "FoodieBox Meta Ad Creative #1 — 'Order Now' CTA", contentType: "meta_ad_creative", platform: ["facebook"], status: "approved", assignedTo: [u["aditya@zrcmedia.in"]], plannedMonth: "2026-05", isAdCreative: true, adDetails: { adObjective: "conversions", targetAudience: "Delhi NCR, 18-35, food lovers", budget: 15000, campaignName: "Summer Menu Launch" }, createdBy: u["rahul@zrcmedia.in"] },
    { contentId: "ZRC-CON-00008", projectId: p["ZRC-PRJ-00003"], clientId: c["FoodieBox"], title: "FoodieBox Reel — Chef's Special Recipe", contentType: "reel", platform: ["instagram"], status: "published", publishedAt: new Date("2026-05-22"), assignedTo: [u["kavya@zrcmedia.in"]], plannedMonth: "2026-05", weekNumber: 3, createdBy: u["rahul@zrcmedia.in"] },
    { contentId: "ZRC-CON-00009", projectId: p["ZRC-PRJ-00004"], clientId: c["LuxeHomes"], title: "LuxeHomes Carousel — Noida Villa Showcase", contentType: "carousel", platform: ["instagram"], status: "in_review", assignedTo: [u["aditya@zrcmedia.in"]], plannedMonth: "2026-05", weekNumber: 4, createdBy: u["rahul@zrcmedia.in"] },
    { contentId: "ZRC-CON-00010", projectId: p["ZRC-PRJ-00004"], clientId: c["LuxeHomes"], title: "LuxeHomes Property Tour Reel — Noida Villa", contentType: "reel", platform: ["instagram", "facebook"], status: "draft", assignedTo: [u["kavya@zrcmedia.in"], u["vijay@zrcmedia.in"]], plannedMonth: "2026-06", weekNumber: 1, createdBy: u["rahul@zrcmedia.in"] },
    { contentId: "ZRC-CON-00011", projectId: p["ZRC-PRJ-00004"], clientId: c["LuxeHomes"], title: "LuxeHomes Video Teaser — Project Launch", contentType: "video", platform: ["instagram", "facebook", "youtube"], status: "draft", assignedTo: [u["vijay@zrcmedia.in"], u["kavya@zrcmedia.in"]], plannedMonth: "2026-06", weekNumber: 2, priority: "high", createdBy: u["rahul@zrcmedia.in"] },
    { contentId: "ZRC-CON-00012", projectId: p["ZRC-PRJ-00006"], clientId: c["GreenLeaf"], title: "GreenLeaf Reel — Farm-to-Table Journey", contentType: "reel", platform: ["instagram"], status: "idea", assignedTo: [u["kavya@zrcmedia.in"]], plannedMonth: "2026-06", weekNumber: 1, createdBy: u["neha@zrcmedia.in"] },
    { contentId: "ZRC-CON-00013", projectId: p["ZRC-PRJ-00006"], clientId: c["GreenLeaf"], title: "GreenLeaf Static — 'Why Go Organic' Series (3 posts)", contentType: "static_post", platform: ["instagram", "facebook"], status: "scheduled", scheduledAt: new Date("2026-06-02"), assignedTo: [u["aditya@zrcmedia.in"]], plannedMonth: "2026-06", weekNumber: 1, createdBy: u["neha@zrcmedia.in"] },
    { contentId: "ZRC-CON-00014", projectId: p["ZRC-PRJ-00006"], clientId: c["GreenLeaf"], title: "GreenLeaf Meta Ad — Organic Oil Promo", contentType: "meta_ad_creative", platform: ["facebook"], status: "awaiting_client", assignedTo: [u["aditya@zrcmedia.in"]], plannedMonth: "2026-06", isAdCreative: true, requiresClientApproval: true, adDetails: { adObjective: "awareness", targetAudience: "India, 25-50, health-conscious", budget: 10000, campaignName: "Organic June" }, createdBy: u["rahul@zrcmedia.in"] },
    { contentId: "ZRC-CON-00015", projectId: p["ZRC-PRJ-00007"], clientId: c["UrbanFit"], title: "UrbanFit Teaser Reel — 'Coming Soon'", contentType: "reel", platform: ["instagram"], status: "approved", assignedTo: [u["kavya@zrcmedia.in"]], plannedMonth: "2026-06", weekNumber: 1, priority: "urgent", createdBy: u["rahul@zrcmedia.in"] },
    { contentId: "ZRC-CON-00016", projectId: p["ZRC-PRJ-00007"], clientId: c["UrbanFit"], title: "UrbanFit Launch Carousel — Founding Member Offer", contentType: "carousel", platform: ["instagram", "facebook"], status: "in_review", assignedTo: [u["aditya@zrcmedia.in"]], plannedMonth: "2026-06", weekNumber: 2, priority: "urgent", createdBy: u["rahul@zrcmedia.in"] },
    { contentId: "ZRC-CON-00017", projectId: p["ZRC-PRJ-00007"], clientId: c["UrbanFit"], title: "UrbanFit Meta Ad — Founding Member CTA", contentType: "meta_ad_creative", platform: ["facebook"], status: "draft", assignedTo: [u["aditya@zrcmedia.in"]], plannedMonth: "2026-06", isAdCreative: true, adDetails: { adObjective: "lead_generation", targetAudience: "Delhi NCR, 20-40, fitness", budget: 25000, campaignName: "UrbanFit Launch" }, createdBy: u["rahul@zrcmedia.in"] },
    { contentId: "ZRC-CON-00018", projectId: p["ZRC-PRJ-00001"], clientId: c["StyleHub"], title: "StyleHub Story Pack — Flash Sale Promo", contentType: "story", platform: ["instagram"], status: "idea", assignedTo: [u["aditya@zrcmedia.in"]], plannedMonth: "2026-06", weekNumber: 3, createdBy: u["neha@zrcmedia.in"] },
    { contentId: "ZRC-CON-00019", projectId: p["ZRC-PRJ-00003"], clientId: c["FoodieBox"], title: "FoodieBox June Carousel — Healthy Bowls", contentType: "carousel", platform: ["instagram"], status: "idea", assignedTo: [u["aditya@zrcmedia.in"]], plannedMonth: "2026-06", weekNumber: 2, createdBy: u["rahul@zrcmedia.in"] },
    { contentId: "ZRC-CON-00020", projectId: p["ZRC-PRJ-00007"], clientId: c["UrbanFit"], title: "UrbanFit Gym Tour Video — Full Walkthrough", contentType: "video", platform: ["instagram", "facebook", "youtube"], status: "idea", assignedTo: [u["vijay@zrcmedia.in"], u["kavya@zrcmedia.in"]], plannedMonth: "2026-06", weekNumber: 3, priority: "urgent", createdBy: u["rahul@zrcmedia.in"] },
  ];
}

// ═══════════════════════════════════════════════════════════════
// INVOICES — 10 invoices across clients/months
// ═══════════════════════════════════════════════════════════════
function buildInvoices(userMap, clientMap) {
  const u = userMap, c = clientMap;
  return [
    { invoiceId: "ZRC-INV-00001", invoiceNumber: "INV-2026-001", clientId: c["StyleHub"], month: 4, year: 2026, lineItems: [{ description: "Social Media Management — April", serviceType: "social_media_management", quantity: 1, unitPrice: 25000, amount: 25000 }, { description: "Reels (4x) — April", serviceType: "reels", quantity: 4, unitPrice: 3000, amount: 12000 }, { description: "Static Posts (12x) + Carousels (4x)", serviceType: "graphics", quantity: 1, unitPrice: 8000, amount: 8000 }], subtotal: 45000, taxRate: 18, taxAmount: 8100, totalAmount: 53100, paidAmount: 53100, status: "paid", dueDate: new Date("2026-04-30"), sentAt: new Date("2026-04-02"), paidAt: new Date("2026-04-15"), createdBy: u["priya@zrcmedia.in"] },
    { invoiceId: "ZRC-INV-00002", invoiceNumber: "INV-2026-002", clientId: c["NexusTech"], month: 5, year: 2026, lineItems: [{ description: "Website Dev — Phase 1 (Wireframes + Design)", serviceType: "website_development", quantity: 1, unitPrice: 65000, amount: 65000 }], subtotal: 65000, taxRate: 18, taxAmount: 11700, totalAmount: 76700, paidAmount: 25000, status: "partial", dueDate: new Date("2026-05-20"), sentAt: new Date("2026-05-02"), createdBy: u["priya@zrcmedia.in"] },
    { invoiceId: "ZRC-INV-00003", invoiceNumber: "INV-2026-003", clientId: c["FoodieBox"], month: 5, year: 2026, lineItems: [{ description: "Meta Ads Management — May", serviceType: "meta_ads", quantity: 1, unitPrice: 15000, amount: 15000 }, { description: "Ad Creatives (6x)", serviceType: "graphics", quantity: 6, unitPrice: 2000, amount: 12000 }, { description: "Carousel (2x)", serviceType: "carousels", quantity: 2, unitPrice: 4000, amount: 8000 }], subtotal: 35000, taxRate: 18, taxAmount: 6300, totalAmount: 41300, paidAmount: 0, status: "overdue", dueDate: new Date("2026-05-10"), sentAt: new Date("2026-05-01"), createdBy: u["priya@zrcmedia.in"] },
    { invoiceId: "ZRC-INV-00004", invoiceNumber: "INV-2026-004", clientId: c["LuxeHomes"], month: 5, year: 2026, lineItems: [{ description: "Video Production — Property Shoot", serviceType: "video_production", quantity: 1, unitPrice: 30000, amount: 30000 }, { description: "Carousels (3x)", serviceType: "carousels", quantity: 3, unitPrice: 4000, amount: 12000 }, { description: "Reels (2x)", serviceType: "reels", quantity: 2, unitPrice: 5000, amount: 10000 }], subtotal: 52000, taxRate: 18, taxAmount: 9360, totalAmount: 61360, paidAmount: 61360, status: "paid", dueDate: new Date("2026-05-25"), sentAt: new Date("2026-05-03"), paidAt: new Date("2026-05-18"), createdBy: u["priya@zrcmedia.in"] },
    { invoiceId: "ZRC-INV-00005", invoiceNumber: "INV-2026-005", clientId: c["PureHealth"], month: 5, year: 2026, lineItems: [{ description: "Social Media Setup & Strategy", serviceType: "social_media_management", quantity: 1, unitPrice: 20000, amount: 20000 }, { description: "Content Writing — Brand Voice Document", serviceType: "content_writing", quantity: 1, unitPrice: 8000, amount: 8000 }], subtotal: 28000, taxRate: 18, taxAmount: 5040, totalAmount: 33040, paidAmount: 0, status: "sent", dueDate: new Date("2026-06-01"), sentAt: new Date("2026-05-20"), createdBy: u["priya@zrcmedia.in"] },
    { invoiceId: "ZRC-INV-00006", invoiceNumber: "INV-2026-006", clientId: c["StyleHub"], month: 5, year: 2026, lineItems: [{ description: "Social Media Management — May", serviceType: "social_media_management", quantity: 1, unitPrice: 25000, amount: 25000 }, { description: "Reels (4x) — May", serviceType: "reels", quantity: 4, unitPrice: 3000, amount: 12000 }, { description: "Static Posts + Carousels — May", serviceType: "graphics", quantity: 1, unitPrice: 8000, amount: 8000 }], subtotal: 45000, taxRate: 18, taxAmount: 8100, totalAmount: 53100, paidAmount: 53100, status: "paid", dueDate: new Date("2026-05-31"), sentAt: new Date("2026-05-02"), paidAt: new Date("2026-05-22"), createdBy: u["priya@zrcmedia.in"] },
    { invoiceId: "ZRC-INV-00007", invoiceNumber: "INV-2026-007", clientId: c["GreenLeaf"], month: 5, year: 2026, lineItems: [{ description: "Social Media Management — May", serviceType: "social_media_management", quantity: 1, unitPrice: 18000, amount: 18000 }, { description: "Reels (2x)", serviceType: "reels", quantity: 2, unitPrice: 4000, amount: 8000 }, { description: "Blog Content (2 articles)", serviceType: "content_writing", quantity: 2, unitPrice: 3000, amount: 6000 }, { description: "Meta Ads Setup", serviceType: "meta_ads", quantity: 1, unitPrice: 6000, amount: 6000 }], subtotal: 38000, taxRate: 18, taxAmount: 6840, totalAmount: 44840, paidAmount: 44840, status: "paid", dueDate: new Date("2026-05-25"), paidAt: new Date("2026-05-20"), sentAt: new Date("2026-05-03"), createdBy: u["priya@zrcmedia.in"] },
    { invoiceId: "ZRC-INV-00008", invoiceNumber: "INV-2026-008", clientId: c["UrbanFit"], month: 5, year: 2026, lineItems: [{ description: "Launch Campaign — Strategy & Setup", serviceType: "meta_ads", quantity: 1, unitPrice: 20000, amount: 20000 }, { description: "Creative Production (Launch Assets)", serviceType: "graphics", quantity: 1, unitPrice: 15000, amount: 15000 }, { description: "Social Media Setup", serviceType: "social_media_management", quantity: 1, unitPrice: 10000, amount: 10000 }, { description: "Initial Shoot (Gym)", serviceType: "video_production", quantity: 1, unitPrice: 10000, amount: 10000 }], subtotal: 55000, taxRate: 18, taxAmount: 9900, totalAmount: 64900, paidAmount: 64900, status: "paid", dueDate: new Date("2026-05-15"), paidAt: new Date("2026-05-10"), sentAt: new Date("2026-05-02"), createdBy: u["priya@zrcmedia.in"] },
    { invoiceId: "ZRC-INV-00009", invoiceNumber: "INV-2026-009", clientId: c["GreenLeaf"], month: 6, year: 2026, lineItems: [{ description: "Social Media Management — June", serviceType: "social_media_management", quantity: 1, unitPrice: 18000, amount: 18000 }, { description: "Reels (3x)", serviceType: "reels", quantity: 3, unitPrice: 4000, amount: 12000 }, { description: "Meta Ads Management", serviceType: "meta_ads", quantity: 1, unitPrice: 8000, amount: 8000 }], subtotal: 38000, taxRate: 18, taxAmount: 6840, totalAmount: 44840, paidAmount: 0, status: "draft", dueDate: new Date("2026-06-25"), createdBy: u["priya@zrcmedia.in"] },
    { invoiceId: "ZRC-INV-00010", invoiceNumber: "INV-2026-010", clientId: c["UrbanFit"], month: 6, year: 2026, lineItems: [{ description: "Ongoing Campaign Management — June", serviceType: "meta_ads", quantity: 1, unitPrice: 20000, amount: 20000 }, { description: "Reels + Video Production (4x)", serviceType: "video_production", quantity: 4, unitPrice: 5000, amount: 20000 }, { description: "Graphic Design (static + carousel)", serviceType: "graphics", quantity: 1, unitPrice: 15000, amount: 15000 }], subtotal: 55000, taxRate: 18, taxAmount: 9900, totalAmount: 64900, paidAmount: 0, status: "draft", dueDate: new Date("2026-06-30"), createdBy: u["priya@zrcmedia.in"] },
  ];
}

// ═══════════════════════════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════════════════════════
function buildPayments(userMap, clientMap, invoiceMap) {
  const u = userMap, c = clientMap, i = invoiceMap;
  return [
    { paymentId: "ZRC-PAY-00001", invoiceId: i["INV-2026-001"], clientId: c["StyleHub"], amount: 53100, paymentDate: new Date("2026-04-15"), paymentMethod: "bank_transfer", transactionRef: "NEFT-APR-SH001", loggedBy: u["priya@zrcmedia.in"] },
    { paymentId: "ZRC-PAY-00002", invoiceId: i["INV-2026-002"], clientId: c["NexusTech"], amount: 25000, paymentDate: new Date("2026-05-12"), paymentMethod: "upi", transactionRef: "UPI-MAY-NT001", notes: "Partial payment — remaining ₹51,700 due", loggedBy: u["priya@zrcmedia.in"] },
    { paymentId: "ZRC-PAY-00003", invoiceId: i["INV-2026-004"], clientId: c["LuxeHomes"], amount: 61360, paymentDate: new Date("2026-05-18"), paymentMethod: "bank_transfer", transactionRef: "NEFT-MAY-LH001", loggedBy: u["priya@zrcmedia.in"] },
    { paymentId: "ZRC-PAY-00004", invoiceId: i["INV-2026-006"], clientId: c["StyleHub"], amount: 53100, paymentDate: new Date("2026-05-22"), paymentMethod: "bank_transfer", transactionRef: "NEFT-MAY-SH002", loggedBy: u["priya@zrcmedia.in"] },
    { paymentId: "ZRC-PAY-00005", invoiceId: i["INV-2026-007"], clientId: c["GreenLeaf"], amount: 44840, paymentDate: new Date("2026-05-20"), paymentMethod: "upi", transactionRef: "UPI-MAY-GL001", loggedBy: u["priya@zrcmedia.in"] },
    { paymentId: "ZRC-PAY-00006", invoiceId: i["INV-2026-008"], clientId: c["UrbanFit"], amount: 64900, paymentDate: new Date("2026-05-10"), paymentMethod: "bank_transfer", transactionRef: "NEFT-MAY-UF001", loggedBy: u["priya@zrcmedia.in"] },
  ];
}

// ═══════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════
function buildNotifications(userMap) {
  const u = userMap;
  return [
    { userId: u["archis@zrcmedia.in"], type: "invoice_overdue", title: "Invoice overdue — FoodieBox", body: "INV-2026-003 (₹41,300) is 18 days overdue. Follow up with Anjali Singh.", link: "/finance", isRead: false },
    { userId: u["archis@zrcmedia.in"], type: "client_onboarded", title: "New client onboarding", body: "PureHealth Wellness has been moved to onboarding status.", link: "/clients", isRead: false },
    { userId: u["archis@zrcmedia.in"], type: "task_completed", title: "Task completed — StyleHub Reel #3", body: "Kavya completed 'StyleHub Reel #3 — Summer Collection BTS'", link: "/tasks", isRead: true },
    { userId: u["rahul@zrcmedia.in"], type: "content_submitted", title: "Content ready for review", body: "StyleHub June Reel #1 submitted by Kavya for review.", link: "/content", isRead: false },
    { userId: u["rahul@zrcmedia.in"], type: "content_submitted", title: "Carousel ready for review", body: "LuxeHomes Carousel — Noida Villa submitted by Aditya.", link: "/content", isRead: false },
    { userId: u["rahul@zrcmedia.in"], type: "task_issue", title: "Issue reported on task", body: "LuxeHomes Carousel #3 has a revision — fonts don't match brand guidelines.", link: "/tasks", isRead: false },
    { userId: u["rahul@zrcmedia.in"], type: "content_submitted", title: "UrbanFit Carousel for review", body: "UrbanFit Launch Carousel submitted by Aditya.", link: "/content", isRead: false },
    { userId: u["priya@zrcmedia.in"], type: "payment_received", title: "Payment received — NexusTech", body: "₹25,000 partial payment logged for INV-2026-002.", link: "/finance", isRead: true },
    { userId: u["priya@zrcmedia.in"], type: "invoice_overdue", title: "Invoice overdue — FoodieBox", body: "INV-2026-003 (₹41,300) is overdue. Contact client.", link: "/finance", isRead: false },
    { userId: u["aditya@zrcmedia.in"], type: "task_assigned", title: "New task assigned", body: "Design UrbanFit Meta Ad Creatives — Founding Member Offer (urgent)", link: "/tasks", isRead: false },
    { userId: u["aditya@zrcmedia.in"], type: "revision_needed", title: "Revision needed — LuxeHomes Carousel #3", body: "PM requested changes: fonts don't match brand guidelines.", link: "/tasks", isRead: false },
    { userId: u["kavya@zrcmedia.in"], type: "task_assigned", title: "New task assigned", body: "Edit NexusTech Brand Intro Video (due May 30)", link: "/tasks", isRead: false },
    { userId: u["vijay@zrcmedia.in"], type: "task_assigned", title: "Urgent shoot assigned", body: "Shoot FoodieBox Product Reel — due tomorrow!", link: "/tasks", isRead: false },
    { userId: u["vijay@zrcmedia.in"], type: "task_assigned", title: "Shoot scheduled", body: "UrbanFit Gym Shoot — Launch Video (June 3)", link: "/tasks", isRead: false },
    { userId: u["neha@zrcmedia.in"], type: "content_approved", title: "Content approved", body: "StyleHub Reel #2 — Behind The Scenes approved by Rahul.", link: "/content", isRead: true },
    { userId: u["ishita@zrcmedia.in"], type: "task_assigned", title: "New task assigned", body: "Write UrbanFit Ad Copy — 5 variants (due June 4)", link: "/tasks", isRead: false },
    { userId: u["dev@zrcmedia.in"], type: "task_assigned", title: "New task assigned", body: "Build NexusTech Contact Page (due June 3)", link: "/tasks", isRead: false },
  ];
}

// ═══════════════════════════════════════════════════════════════
// MAIN SEED FUNCTION
// ═══════════════════════════════════════════════════════════════
async function seedAll() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // First run bootstrap for roles/departments
    const { bootstrap } = require("./bootstrap");
    await bootstrap();

    // Drop existing data (except roles/departments)
    console.log("🗑️  Clearing existing data...");
    await Promise.all([
      User.deleteMany({}), Client.deleteMany({}), Project.deleteMany({}),
      Task.deleteMany({}), ContentItem.deleteMany({}), Invoice.deleteMany({}),
      Payment.deleteMany({}), Notification.deleteMany({}), AuditLog.deleteMany({}),
      Counter.deleteMany({}),
    ]);

    // ── 1. USERS ──
    console.log("👥 Seeding users...");
    const createdUsers = [];
    for (const userData of USERS) {
      const user = await User.create(userData);
      createdUsers.push(user);
    }
    // Map by email → _id
    const userMap = {};
    createdUsers.forEach(u => { userMap[u.email] = u._id; });
    console.log(`   ✅ ${createdUsers.length} users created`);

    // ── 2. CLIENTS ──
    console.log("🏢 Seeding clients...");
    const clientsData = buildClients(userMap);
    const createdClients = await Client.insertMany(clientsData);
    const clientMap = {};
    createdClients.forEach(c => { clientMap[c.displayName] = c._id; });
    console.log(`   ✅ ${createdClients.length} clients created`);

    // ── 3. PROJECTS ──
    console.log("📁 Seeding projects...");
    const projectsData = buildProjects(userMap, clientMap);
    const createdProjects = await Project.insertMany(projectsData);
    const projectMap = {};
    createdProjects.forEach(p => { projectMap[p.projectId] = p._id; });
    console.log(`   ✅ ${createdProjects.length} projects created`);

    // ── 4. TASKS ──
    console.log("✅ Seeding tasks...");
    const tasksData = buildTasks(userMap, projectMap);
    const createdTasks = await Task.insertMany(tasksData);
    console.log(`   ✅ ${createdTasks.length} tasks created`);

    // ── 5. CONTENT ──
    console.log("📅 Seeding content items...");
    const contentData = buildContent(userMap, projectMap, clientMap);
    const createdContent = await ContentItem.insertMany(contentData);
    console.log(`   ✅ ${createdContent.length} content items created`);

    // ── 6. INVOICES ──
    console.log("💰 Seeding invoices...");
    const invoicesData = buildInvoices(userMap, clientMap);
    const createdInvoices = await Invoice.insertMany(invoicesData);
    const invoiceMap = {};
    createdInvoices.forEach(i => { invoiceMap[i.invoiceNumber] = i._id; });
    console.log(`   ✅ ${createdInvoices.length} invoices created`);

    // ── 7. PAYMENTS ──
    console.log("💳 Seeding payments...");
    const paymentsData = buildPayments(userMap, clientMap, invoiceMap);
    const createdPayments = await Payment.insertMany(paymentsData);
    console.log(`   ✅ ${createdPayments.length} payments created`);

    // ── 8. NOTIFICATIONS ──
    console.log("🔔 Seeding notifications...");
    const notifData = buildNotifications(userMap);
    const createdNotifs = await Notification.insertMany(notifData);
    console.log(`   ✅ ${createdNotifs.length} notifications created`);

    // ── 9. SET COUNTERS ──
    await Counter.insertMany([
      { _id: "user",    seq: 12 },
      { _id: "client",  seq: 8 },
      { _id: "project", seq: 7 },
      { _id: "task",    seq: 25 },
      { _id: "content", seq: 20 },
      { _id: "invoice", seq: 10 },
      { _id: "payment", seq: 6 },
    ]);
    console.log("   ✅ Counters set");

    // ═══════════════════════════════════════════════════════════
    // PRINT LOGIN CREDENTIALS
    // ═══════════════════════════════════════════════════════════
    console.log("\n" + "═".repeat(60));
    console.log("  🔐 LOGIN CREDENTIALS");
    console.log("═".repeat(60));
    console.log("");
    console.log("  ┌─────────────────────┬───────────────────────────┬──────────┬──────────────────────────┐");
    console.log("  │ Name                │ Email                     │ Password │ Role                     │");
    console.log("  ├─────────────────────┼───────────────────────────┼──────────┼──────────────────────────┤");
    for (const u of USERS) {
      const name = u.name.padEnd(19);
      const email = u.email.padEnd(25);
      const pwd = u.password.padEnd(8);
      const role = u.role.replace(/_/g, " ").padEnd(24);
      console.log(`  │ ${name} │ ${email} │ ${pwd} │ ${role} │`);
    }
    console.log("  └─────────────────────┴───────────────────────────┴──────────┴──────────────────────────┘");
    console.log("");

    console.log("  📊 SEED SUMMARY");
    console.log("  ─────────────────────────────────────────");
    console.log(`  Users:         ${createdUsers.length}`);
    console.log(`  Clients:       ${createdClients.length}`);
    console.log(`  Projects:      ${createdProjects.length}`);
    console.log(`  Tasks:         ${createdTasks.length}`);
    console.log(`  Content Items: ${createdContent.length}`);
    console.log(`  Invoices:      ${createdInvoices.length}`);
    console.log(`  Payments:      ${createdPayments.length}`);
    console.log(`  Notifications: ${createdNotifs.length}`);
    console.log("  ─────────────────────────────────────────");
    console.log("  ✅ Database seeded successfully!\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedAll();
