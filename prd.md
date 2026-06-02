# ZRC Media Network — CRM + Project Management System
## Product Requirements Document (PRD)
**Version:** 1.0  
**Date:** May 2026  
**Status:** DRAFT — Awaiting Stakeholder Approval  
**Business:** ZRC Media Network (Website Development + Digital Marketing Agency)  
**Owners / Admins:** 3 co-founders / admins managing the entire business

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Lessons Learned from crmhrms](#2-lessons-learned-from-crmhrms)
3. [Business Context & Goals](#3-business-context--goals)
4. [System Users & Role Hierarchy](#4-system-users--role-hierarchy)
5. [Module Overview](#5-module-overview)
6. [Module 1: Client Management](#6-module-1-client-management)
7. [Module 2: Project Management](#7-module-2-project-management)
8. [Module 3: Content Calendar & Approval Workflow](#8-module-3-content-calendar--approval-workflow)
9. [Module 4: Task Management](#9-module-4-task-management)
10. [Module 5: Finance & Payments](#10-module-5-finance--payments)
11. [Module 6: Client Portal](#11-module-6-client-portal)
12. [Module 7: Team Chat & Messaging](#12-module-7-team-chat--messaging)
13. [Module 8: Reports & Analytics](#13-module-8-reports--analytics)
14. [Module 9: Notifications](#14-module-9-notifications)
15. [Module 10: Settings & Administration](#15-module-10-settings--administration)
16. [Technical Architecture](#16-technical-architecture)
17. [Database Schema Reference](#17-database-schema-reference)
18. [API Surface (Route Map)](#18-api-surface-route-map)
19. [UI/UX Design Guidelines](#19-uiux-design-guidelines)
20. [Implementation Roadmap](#20-implementation-roadmap)
21. [Open Questions](#21-open-questions)

---

## 1. Executive Summary

ZRC Media Network is a digital-first agency specializing in **website development** and **digital marketing**. Their core services are: website design & development, social media profile management, Meta ads (Facebook & Instagram paid advertising), video reels, graphic design (carousels, static posts, banners), and video production. The business is owned and operated by **3 co-founders/admins** who manage everything from client onboarding to delivery.

As the team grows across creative departments — social media managers, graphic designers, video editors, cinematographers, content writers — operational complexity has outpaced informal coordination. This system replaces scattered communication with a **single source of truth** for every client, project, piece of content, and rupee.

This document defines the complete **ZRC CRM + PM System**: a purpose-built internal platform that connects client onboarding, project delivery, creative content workflows, real-time payment tracking, and a client-facing portal.

### What This System Will Do

| Domain | What It Solves |
|--------|---------------|
| **Client Management** | Onboard clients, track contracts, services subscribed, and lifecycle |
| **Project Management** | Create projects per client, assign cross-department teams, track delivery |
| **Content Calendar** | Plan reels, carousels, static posts — get internal approval then client sign-off |
| **Task Management** | Admins assign tasks (shoot reel, design carousel, run Meta ad) — team updates progress |
| **Finance** | Know exactly what each client owes monthly: collected vs. outstanding |
| **Client Portal** | Clients see project status, content calendar, invoices, chat with team |
| **Team Messaging** | Internal DMs + per-project channels + department channels |
| **Reports** | Revenue, project health, content output, Meta ad campaign tracking |

---

## 2. Lessons Learned from crmhrms

Before designing the new system, a deep audit of the existing `crmhrms` codebase was performed. The following observations inform the design decisions of ZRC CRM:

### 2.1 What Was Built Well

| Area | What Was Good |
|------|--------------|
| **Tech Stack** | Node.js + Express + MongoDB + React + Vite + Socket.io — solid, proven stack |
| **Role Architecture** | Dynamic role system (not hardcoded enums) using a Role collection — excellent flexibility |
| **Token Versioning** | JWT token version bump on role change prevents stale token attacks |
| **Audit Logging** | AuditLog model captures all destructive actions — keep this pattern |
| **Auto-IDs** | Atomic counter-based IDs (CLT00001, PRJ00001) — no race conditions |
| **Socket.io Notifications** | Per-user room-based notifications + persisted Notification model |
| **Project Segmentation** | ProjectSegment (phases within a project) is a powerful pattern |
| **Support Tickets** | Client-side ticket system with staff-internal notes was thoughtful |
| **Leave Management** | Sandwich policy, per-type balances, carry-forward logic — keep this pattern |
| **Soft Deletes** | isArchived pattern everywhere prevents accidental data loss |

### 2.2 Critical Mistakes to Not Repeat

| Problem | Root Cause | Fix in ZRC CRM |
|---------|-----------|----------------|
| **Over-engineered early** | Built leave carry-forward, sandwich policy, payroll, sales pipeline, SEO backlinks all at once — too complex to stabilize | Build phase-by-phase. Lock Phase 1 before starting Phase 2 |
| **Schema inconsistency** | Project.js had both client (single) and clients (array) simultaneously, causing query bugs | One schema, one source of truth from day one |
| **Too many models** | 48 model files for one system made navigation impossible and caused circular dependency risks | ZRC starts with 20 focused models, grows deliberately |
| **Missing business context** | System tried to be a generic HRMS + CRM. No agency-specific concepts (content calendar, approval flow, shooting schedule) | Design from ZRC actual workflows |
| **Client portal was thin** | ClientPortal had overview, projects, files, tickets, messages — but no real-time project task visibility | ZRC portal must show live task status, payment history, and project timeline |
| **Finance was planned but never built** | Invoice and Payment models existed only in tech_details.md — never implemented | Finance is a Day 1 core module, not an afterthought |
| **No content calendar** | Zero concept of content planning, post scheduling, approval workflows | Content Calendar is a first-class module |
| **Approval workflows were missing** | Tasks had review status but no formal approval chain (who approves what) | Every creative output has a defined approver chain |
| **Role slugs were generic** | developer, seo_specialist — not specific to a digital marketing agency | ZRC roles are agency-specific: social_media_manager, video_editor, cinematographer, etc. |
| **No payment tracking per client monthly** | No way to answer what is owed this month | Finance module tracks MRR, per-client payments, monthly outstanding |

---

## 3. Business Context & Goals

### 3.1 What ZRC Media Network Does

ZRC Media Network's actual service offerings (everything the system must support):

| Service | What It Involves | Team Responsible |
|---------|----------------|------------------|
| **Website Development** | Design + build client websites (landing pages, portfolios, business sites) | Web Developer |
| **Social Media Profiles** | Manage Instagram, Facebook pages — strategy, planning, posting | Social Media Manager |
| **Meta Ads** | Run Facebook + Instagram paid ad campaigns (creatives + targeting + reporting) | Social Media Manager + Graphic Designer |
| **Reels** | Shoot, edit, caption and publish short-form video content | Cinematographer + Video Editor + SMM |
| **Graphics** | Static posts, banners, story graphics, ad creatives | Graphic Designer |
| **Carousels** | Multi-slide Instagram/Facebook carousel posts | Graphic Designer + Content Writer |
| **Videos** | Long-form brand videos, testimonials, product videos | Cinematographer + Video Editor |

The business is owned by **3 co-founders who act as admins** and manage:
- Client relationships and onboarding
- Project allocation and cross-department coordination
- Financial tracking and billing
- Team performance management

### 3.2 Primary Business Goals

1. **Centralize client data** — One source of truth: what each client is paying for, what services they get, project status
2. **Track money clearly** — Know exactly how much revenue is expected each month, what has been collected, what is pending per client
3. **Run creative workflows end-to-end** — SMM plans the month's content → designer creates graphics → video editor cuts reels → approved by admin → client signs off → published
4. **Meta Ads accountability** — Track which ads are running for which client, budget, and performance notes in one place
5. **Give clients transparency** — Clients log in and see their content calendar, project status, and invoices
6. **Hold team accountable** — Every task is assigned to a specific person with a deadline and status trail
7. **Scale without chaos** — As the team grows, the system routes the right deliverable to the right department automatically

---

## 4. System Users & Role Hierarchy

### 4.1 Role Definitions

The system has two role families: Internal Staff and External Clients.

#### Internal Staff Roles (Hierarchy Level 1-10)

| Level | Role Slug | Display Name | Description |
|-------|-----------|-------------|-------------|
| 10 | `super_admin` | Super Admin | Full system access. All 3 ZRC co-founders. Can do anything. |
| 9 | `admin` | Admin | Delegated admin. Can manage clients, projects, finance. Same as super_admin for most purposes. |
| 8 | `project_manager` | Project Manager | Creates and manages projects. Assigns tasks. Approves creative deliverables. Reviews submissions. |
| 7 | `dept_head` | Department Head | Oversees a specific department (e.g., Head of Creative, Head of Social Media). Sees all team tasks, resolves blockers. |
| 6 | `account_manager` | Account Manager | Client relationship owner. Manages client portfolio. Creates invoices, logs payments. |
| 5 | `social_media_manager` | Social Media Manager | Plans monthly content calendar, writes captions, schedules posts, manages Meta ad campaigns for clients |
| 5 | `graphic_designer` | Graphic Designer | Creates static posts, carousels, story graphics, Meta ad creatives, banners. Uploads deliverables for review. |
| 5 | `video_editor` | Video Editor | Edits raw footage into reels, videos, ads. Uploads final cuts for review. |
| 5 | `cinematographer` | Cinematographer | Shoots video and photo content on-site. Logs shoot completion, uploads raw footage. |
| 5 | `content_writer` | Content Writer | Writes captions, website copy, ad copy, carousel text. Submits drafts for review. |
| 5 | `web_developer` | Web Developer | Designs and builds client websites. Manages development tasks and deployments. |
| 4 | `employee` | Employee | General staff member. Fallback role. Sees only tasks assigned to them. |

#### External Roles

| Level | Role Slug | Display Name | Description |
|-------|-----------|-------------|-------------|
| 1 | `client` | Client | Client portal access only. Scoped strictly to their own projects, content, and invoices. |

### 4.2 Department Structure

| Department Slug | Display Name | Roles In This Dept | What They Produce |
|----------------|-------------|--------------------|-----------------|
| `management` | Management | super_admin, admin, account_manager | Strategy, client relationships, finance |
| `social_media` | Social Media | social_media_manager, content_writer | Content calendar, captions, Meta ad strategy, posting |
| `creative` | Creative | graphic_designer, video_editor, cinematographer | Graphics, carousels, reels, videos, ad creatives |
| `development` | Development | web_developer | Websites, landing pages, web apps |
| `projects` | Project Management | project_manager | Cross-department coordination, delivery |

### 4.3 Permission Matrix (High Level)

| Action | super_admin | admin | project_manager | dept_head | account_manager | dept_employee | client |
|--------|:-----------:|:-----:|:---------------:|:---------:|:---------------:|:-------------:|:------:|
| Create/edit clients | YES | YES | NO | NO | YES (own) | NO | NO |
| View all clients | YES | YES | YES | NO | Own only | NO | NO |
| Create projects | YES | YES | YES | NO | NO | NO | NO |
| Assign tasks | YES | YES | YES | YES (dept) | NO | NO | NO |
| Update task status | YES | YES | YES | YES | YES | Own only | NO |
| Create invoices | YES | YES | NO | NO | YES | NO | NO |
| Log payments | YES | YES | NO | NO | YES | NO | NO |
| View finance | YES | YES | NO | NO | Own clients | NO | Own data |
| Plan content calendar | YES | YES | YES | YES | NO | SMM only | NO |
| Approve content | YES | YES | YES | YES | NO | NO | NO |
| Client portal access | NO | NO | NO | NO | NO | NO | YES |
| Manage users/roles | YES | YES | NO | NO | NO | NO | NO |
| View reports | YES | YES | YES (own proj) | YES (dept) | Own clients | NO | NO |

---

## 5. Module Overview

The ZRC CRM + PM System is organized into 10 core modules:

- Client Management — Onboard, track, manage client lifecycle
- Project Management — Create projects, assign teams, track progress
- Content Calendar — Plan, approve, schedule social/content posts
- Task Management — Assign tasks, track progress, report issues
- Finance & Payments — Invoices, payments, MRR tracking, outstanding
- Client Portal — External-facing client dashboard
- Team Messaging — Internal chat (DM + group channels)
- Reports & Analytics — Revenue, project health, team performance
- Notifications — Real-time in-app + email notifications
- Settings & Admin — Users, roles, departments, system settings

---

## 6. Module 1: Client Management

### 6.1 Overview

The Client module is the central hub of the business. Every project, invoice, and payment links back to a client. Account managers own their client portfolios; admins have global visibility.

### 6.2 Client Lifecycle Stages

prospect → onboarding → active → paused → churned → reactivated

| Status | Meaning |
|--------|---------|
| `prospect` | Interested but not signed yet. Contract not confirmed |
| `onboarding` | Signed. Setting up access, collecting assets, defining project scope |
| `active` | Live. Running projects, billing active |
| `paused` | Temporarily halted (their request, payment dispute, budget freeze) |
| `churned` | Left. All projects ended. Requires churn reason |
| `reactivated` | Returning client. New contract terms |

### 6.3 Client Data Model

**Core Client Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `clientId` | String (auto) | ZRC-CLT-00001 format |
| `companyName` | String (required) | Official business name |
| `displayName` | String | Short name / trade name |
| `contactName` | String | Primary contact person |
| `contactEmail` | String | Primary email (also portal login) |
| `contactPhone` | String | Primary phone |
| `website` | String | Client's website |
| `industry` | String | Industry vertical |
| `region` | Enum | north_india / south_india / east_india / west_india / international |
| `gstNumber` | String | GST for invoicing |
| `panNumber` | String | PAN for compliance |
| `billingAddress` | String | Full billing address |
| `logo` | String (URL) | Client logo |
| `status` | Enum | Lifecycle stage |
| `statusHistory` | Array | Audit log of status changes |

**Services & Contract:**

| Field | Type | Description |
|-------|------|-------------|
| `services` | Array[Enum] | Services contracted — see Service Enum below |
| `contract.monthlyValue` | Number | Monthly recurring revenue (MRR) from this client |
| `contract.currency` | Enum | INR / USD / AED / GBP |
| `contract.billingCycle` | Enum | monthly / quarterly / annually / one_time |
| `contract.startDate` | Date | Contract start |
| `contract.endDate` | Date | Contract end / renewal |
| `contract.autoRenew` | Boolean | Auto-renewal flag |
| `contract.totalValue` | Number | Total contract value (for one-time or project-based billing) |
| `contract.terms` | String | Key contract terms / notes |

**Service Enum — ZRC's Actual Offerings:**

| Slug | Display Name | Typical Monthly Deliverables |
|------|-------------|------------------------------|
| `social_media_management` | Social Media Management | Content calendar, posting, engagement management on Instagram/Facebook |
| `meta_ads` | Meta Ads (Facebook + Instagram) | Paid ad campaigns — creatives, targeting, budget management, reporting |
| `reels` | Reels Production | Short-form vertical video — shoot, edit, caption, publish |
| `graphics` | Graphic Design | Static posts, story graphics, banners, templates |
| `carousels` | Carousel Design | Multi-slide educational/promotional carousels for Instagram/Facebook |
| `video_production` | Video Production | Long-form brand/product videos — shoot, edit, deliver |
| `website_development` | Website Development | Design + code client websites, landing pages, portfolios |
| `website_maintenance` | Website Maintenance | Monthly updates, backups, plugin/content updates on existing sites |
| `content_writing` | Content Writing | Ad copy, website copy, captions, blog posts |
| `photography` | Photography | Product/brand photo shoots |

**Ownership:**

| Field | Type | Description |
|-------|------|-------------|
| `accountManagerId` | ObjectId → User | Who manages this client relationship |
| `enteredBy` | ObjectId → User | Who created the client record |
| `ownershipHistory` | Array | Log of AM changes with reason |

**Engagement:**

| Field | Type | Description |
|-------|------|-------------|
| `priority` | Enum | low / medium / high / vip |
| `healthScore` | Number (0-100) | Client satisfaction/health indicator |
| `tags` | Array[String] | Custom labels |
| `notes` | String | Quick internal notes |
| `lastContactedAt` | Date | Last touchpoint |
| `nextFollowUpAt` | Date | Scheduled next contact |
| `churnReason` | String | Required when status = churned |

**Portal Access:**

| Field | Type | Description |
|-------|------|-------------|
| `portalUserId` | ObjectId → User | The linked User record for client portal login |
| `portalEnabled` | Boolean | Whether portal access is active |

### 6.4 Client Sub-Collections

**ClientContact** — Multiple contacts per client
- Fields: name, email, phone, designation, role (primary/billing/technical/executive), isPrimary, isActive

**ClientNote** — Interaction log
- Fields: type (call/email/meeting/whatsapp/note), subject, body, contactedPerson, interactionDate, followUpRequired, isVisibleToClient (default: false)

**ClientFile** — Files shared with the client
- Fields: name, fileUrl, fileType, fileSize, category (contract/proposal/asset/report), uploadedBy, isVisibleToClient

### 6.5 Key Business Rules

1. A client must always have an accountManagerId. Admins assign this on creation.
2. Only admins can change accountManagerId. Change is logged to ownershipHistory.
3. Transitioning to churned requires a churnReason.
4. Contract endDate triggers a renewal alert 30 days prior (in-app + email to AM + admin).
5. Client portal login is separate from internal staff login — different user table role (client).
6. When a client is churned, all active projects are flagged as on_hold and admin is notified.

### 6.6 API Routes (Client Module)

| Method | Endpoint | Min Role | Purpose |
|--------|---------|---------|---------|
| POST | `/api/clients` | admin, account_manager | Create client |
| GET | `/api/clients` | account_manager+ | List clients (scoped by role) |
| GET | `/api/clients/:id` | account_manager+ | Client detail |
| PATCH | `/api/clients/:id` | account_manager (own), admin | Edit client |
| DELETE | `/api/clients/:id` | admin | Soft delete (archive) |
| PATCH | `/api/clients/:id/status` | account_manager (own), admin | Change lifecycle status |
| PATCH | `/api/clients/:id/reassign` | admin | Change account manager |
| POST | `/api/clients/:id/contacts` | account_manager (own), admin | Add contact |
| GET | `/api/clients/:id/contacts` | account_manager+ | List contacts |
| POST | `/api/clients/:id/notes` | account_manager+ | Log interaction |
| GET | `/api/clients/:id/notes` | account_manager+ | Interaction history |
| POST | `/api/clients/:id/files` | account_manager+, project_manager | Upload file |
| GET | `/api/clients/:id/files` | account_manager+ | List files |
| POST | `/api/clients/:id/portal-access` | admin | Enable/disable portal |
| GET | `/api/clients/renewal-alerts` | admin, account_manager | Contracts expiring in 30 days |
| GET | `/api/clients/:id/financials` | admin, account_manager (own) | Full financial summary |

---

## 7. Module 2: Project Management

### 7.1 Overview

Projects are the primary unit of work delivery at ZRC. Each project belongs to a client, has a type (what kind of work), a team, milestones, and tasks. Projects are managed by a project_manager who coordinates across departments.

### 7.2 Project Types

Project types map directly to ZRC's actual service offerings. A single client project can span multiple types (e.g., a client on Social Media + Meta Ads + Reels is one project with three types).

| Type Slug | Display Name | Primary Department | What Gets Delivered |
|-----------|-------------|-------------------|--------------------|
| `social_media_management` | Social Media Management | Social Media | Monthly content calendar, scheduling, posting, engagement |
| `meta_ads` | Meta Ads Management | Social Media + Creative | Ad creatives, campaign setup, budget tracking, monthly ad report |
| `reels` | Reels Production | Creative (Cinematographer + Video Editor) + SMM | Scripted, shot, edited, captioned, published short-form video |
| `graphics` | Graphic Design | Creative | Static posts, story graphics, banners, templates |
| `carousels` | Carousel Design | Creative + Content Writing | Multi-slide carousels for Instagram/Facebook |
| `video_production` | Video Production | Creative (Cinematographer + Video Editor) | Long-form brand/product videos |
| `website_development` | Website Development | Development | Full website design and build |
| `website_maintenance` | Website Maintenance | Development | Ongoing monthly website updates, backups, fixes |
| `photography` | Photography / Shoot | Creative (Cinematographer) | Photo shoot for brand, products, events |
| `content_writing` | Content Writing | Social Media | Ad copy, captions, website copy, blog posts |
| `custom` | Custom / Other | — | Any non-standard engagement |

### 7.3 Project Data Model

| Field | Type | Description |
|-------|------|-------------|
| `projectId` | String | ZRC-PRJ-00001 |
| `name` | String (required) | Project name |
| `description` | String | Scope / brief description |
| `type` | Array[Enum] | One or more project types |
| `clientId` | ObjectId → Client | Parent client |
| `status` | Enum | planning / active / on_hold / completed / cancelled |
| `priority` | Enum | low / medium / high / critical |
| `startDate` | Date | Project start date |
| `endDate` | Date | Deadline |
| `projectManagerId` | ObjectId → User | Primary PM (required) |
| `teamMembers` | Array | All team members and their role within this project |
| `milestones` | Array (embedded) | Key checkpoints |
| `overallProgress` | Number (0-100) | Auto-calculated from tasks |
| `budget` | Number | Project budget |
| `currency` | String | INR/USD etc |
| `statusHistory` | Array | Audit log of status changes |
| `cancelReason` | String | Required when cancelled |
| `tags` | Array[String] | Custom labels |
| `isArchived` | Boolean | Soft delete |

### 7.4 Project Phases

Each project has typed phases that match ZRC's actual agency workflow. Phases are stored in a `ProjectPhase` collection with a `serviceType` field and `departmentOwner`.

**Example: Social Media Management + Meta Ads + Reels Project**

| Phase Slug | Display | Service Type | Department | What Happens |
|-----------|---------|-------------|-----------|-------------|
| `onboarding` | Client Onboarding | all | Management | Collect brand assets, access credentials, brief document |
| `strategy` | Monthly Strategy | social_media_management / meta_ads | Social Media | Content themes, ad objectives, posting schedule for the month |
| `content_planning` | Content Planning | social_media_management | Social Media | Plan all posts for the month: what to post, when, what type |
| `shooting` | Video / Photo Shoot | reels / video_production / photography | Creative | On-site shoot. Cinematographer uploads raw footage. |
| `editing` | Video Editing | reels / video_production | Creative | Video Editor cuts footage, adds captions, music, transitions |
| `design` | Graphic Design | graphics / carousels / meta_ads | Creative | Graphic Designer creates all static and carousel creatives |
| `copywriting` | Caption & Copy Writing | all | Social Media | Content Writer writes captions, carousel text, ad copy |
| `internal_review` | Internal Review | all | PM / Dept Head | PM reviews all deliverables before sending to client |
| `client_review` | Client Review | all | Client | Client reviews and approves/rejects content |
| `scheduling` | Scheduling & Publishing | social_media_management | Social Media | SMM schedules approved posts, publishes content |
| `ads_setup` | Meta Ads Setup | meta_ads | Social Media | Ad campaigns configured in Meta Ads Manager |
| `reporting` | Monthly Report | all | PM / AM | Performance summary sent to client |

**Example: Website Development Project**

| Phase Slug | Display | What Happens |
|-----------|---------|-------------|
| `discovery` | Discovery & Brief | Requirements gathering, competitor research, sitemap |
| `design` | UI/UX Design | Wireframes and visual design in Figma |
| `development` | Development | Frontend + backend coding |
| `content_integration` | Content Integration | Copy and images placed into the website |
| `testing` | Testing & QA | Cross-browser, mobile responsive testing |
| `client_review` | Client Review | Client reviews site on staging |
| `launch` | Go Live | Domain setup, deployment, handover |

### 7.5 Team Allocation Rules

1. A project must have exactly one projectManagerId (required).
2. Team members are added with a projectRole (their function within this project, not their system role).
3. Only PM, dept_head, admin can add/remove team members.
4. Employees only see tasks and projects they are members of (role-scoped visibility).
5. When a team member is removed from a project, their todo tasks are reassigned to the PM.

### 7.6 Project Visibility Rules

| Role | Projects Visible |
|------|----------------|
| super_admin, admin | All projects |
| project_manager | All projects they manage |
| dept_head | All projects with members from their department |
| account_manager | All projects for their client portfolio |
| dept_employee | Only projects they are a team member of |
| client | Only their own projects (via portal) |

### 7.7 API Routes (Project Module)

| Method | Endpoint | Min Role | Purpose |
|--------|---------|---------|---------|
| POST | `/api/projects` | admin, project_manager | Create project |
| GET | `/api/projects` | account_manager+ | List projects (scoped) |
| GET | `/api/projects/:id` | team_member, account_manager, admin | Project detail |
| PATCH | `/api/projects/:id` | project_manager (own), admin | Edit project |
| DELETE | `/api/projects/:id` | admin | Archive project |
| PATCH | `/api/projects/:id/status` | project_manager (own), admin | Change status |
| POST | `/api/projects/:id/members` | project_manager (own), admin | Add team member |
| DELETE | `/api/projects/:id/members/:userId` | project_manager (own), admin | Remove member |
| POST | `/api/projects/:id/phases` | project_manager (own), admin | Add phase |
| PATCH | `/api/projects/:id/phases/:phaseId` | project_manager (own), admin | Update phase |
| GET | `/api/projects/:id/calendar` | team_member+ | Full calendar view |
| GET | `/api/projects/:id/timeline` | team_member+ | Timeline/Gantt data |
| GET | `/api/projects/:id/financials` | account_manager, admin | Financial summary |
| GET | `/api/projects/my` | Any authenticated staff | Projects I am a member of |

---

## 8. Module 3: Content Calendar & Approval Workflow

### 8.1 Overview

This is the most agency-critical module that did not exist in crmhrms. The Content Calendar manages the entire lifecycle of a piece of content: from planning, to creation, to review, to approval, to scheduling, to publishing.

### 8.2 Content Item Lifecycle

idea → draft → in_review → revision_needed → approved → scheduled → published

| Status | Actor | Description |
|--------|-------|-------------|
| `idea` | SMM / PM | Initial content idea added to the calendar |
| `draft` | SMM / Designer / Video Editor / Content Writer | Content being created (design, editing, captioning) |
| `in_review` | Creator submits | Waiting for internal approval by PM or Dept Head |
| `revision_needed` | Reviewer rejects | Sent back with specific feedback. Creator revises. |
| `approved` | PM / Dept Head / Admin | Internally approved. Ready for client review (if required) or scheduling. |
| `awaiting_client` | System (if requiresClientApproval) | Sent to client portal for client sign-off |
| `scheduled` | SMM | Date/time set in posting tool or Meta Ads Manager |
| `published` | SMM | Live on Instagram / Facebook / website |
| `cancelled` | PM / Admin | Content item dropped |

### 8.3 Content Item Data Model

| Field | Type | Description |
|-------|------|-------------|
| `contentId` | String | ZRC-CON-00001 |
| `projectId` | ObjectId → Project | Parent project |
| `clientId` | ObjectId → Client | Client this content belongs to |
| `title` | String | Brief content description (e.g. "Week 1 — Product Reel") |
| `contentType` | Enum | See Content Type Enum below |
| `platform` | Array[Enum] | instagram / facebook / instagram_story / facebook_story / youtube / website |
| `caption` | String | Full post caption / ad copy |
| `hashtags` | Array[String] | Hashtags for organic posts |
| `visualAssets` | Array | Uploaded files: graphics, videos, edited reels (url, name, type, size, uploadedBy) |
| `rawFootageUrl` | String | For reels/video — link to raw footage uploaded by cinematographer |
| `adDetails` | Object | For Meta Ads: adObjective, targetAudience, budget, adSetName, campaignName |
| `status` | Enum | Content lifecycle status |
| `statusHistory` | Array | Full audit log of every status change |
| `scheduledAt` | Date | When to post / when ads go live |
| `publishedAt` | Date | When actually posted/published |
| `publishedUrl` | String | Link to live post or ad |
| `assignedTo` | Array[ObjectId] | Assigned creators (SMM, designer, video editor, writer) |
| `reviewedBy` | ObjectId → User | Who approved or rejected internally |
| `reviewedAt` | Date | When internally reviewed |
| `reviewNotes` | String | Approval or rejection feedback |
| `revisionHistory` | Array | History of each revision round with feedback and timestamps |
| `plannedMonth` | String | YYYY-MM — which month this content is for |
| `weekNumber` | Number | Week of the month (1–5) for calendar placement |
| `dayOfWeek` | String | Preferred posting day (monday / tuesday / etc.) |
| `postingTime` | String | Preferred posting time (HH:MM) |
| `priority` | Enum | low / medium / high / urgent |
| `clientFacing` | Boolean | Whether client can see this item in their portal |
| `requiresClientApproval` | Boolean | Whether client must approve before publishing (set per project) |
| `isAdCreative` | Boolean | True if this content is specifically for a Meta ad campaign |
| `createdBy` | ObjectId → User | Who created the content item |

**Content Type Enum — ZRC's Actual Deliverables:**

| Slug | Display | Who Creates | Platform |
|------|---------|------------|----------|
| `reel` | Reel | Cinematographer + Video Editor + SMM | Instagram, Facebook |
| `static_post` | Static Post | Graphic Designer + SMM | Instagram, Facebook |
| `carousel` | Carousel | Graphic Designer + Content Writer + SMM | Instagram, Facebook |
| `story` | Story | Graphic Designer + SMM | Instagram Story, Facebook Story |
| `video` | Video (Long-form) | Cinematographer + Video Editor | YouTube, Facebook, Website |
| `meta_ad_creative` | Meta Ad Creative | Graphic Designer + Content Writer | Facebook Ads, Instagram Ads |
| `banner` | Banner / Cover | Graphic Designer | Facebook Cover, Website |
| `thumbnail` | Thumbnail | Graphic Designer | YouTube |
| `website_content` | Website Page | Web Developer + Content Writer | Website |
| `ad_copy` | Ad Copy | Content Writer | Meta Ads |

### 8.4 Approval Workflow

**Standard Content Approval Chain:**

```
Creator → in_review → [PM / Dept Head reviews]
  ↓ Approve           ↓ Reject
approved          revision_needed → Creator revises → in_review again
  ↓ (if requiresClientApproval)
awaiting_client → [Client reviews in portal]
  ↓ Approve           ↓ Reject
scheduled         revision_needed (PM notified)
  ↓
published
```

**Special Case: Meta Ad Creatives**
- Ad creatives go through the same review chain
- After approval, the SMM sets up the campaign in Meta Ads Manager
- The content item's `adDetails` field stores: objective, audience, budget, campaign name
- After launch, a `meta_ads_management` task tracks campaign monitoring

**Bulk Monthly Approval:**
- PM can see all content for a client for a given month in one view
- Can approve/reject/comment on multiple items in one session
- "Approve All" shortcut for fast monthly batch sign-off

### 8.5 Calendar View

The Content Calendar renders as a **monthly drag-and-drop calendar**. Each day cell shows content items as color-coded chips:

| Color | Status |
|-------|--------|
| Gray | idea / draft |
| Yellow | in_review |
| Blue | awaiting_client |
| Green | approved / scheduled |
| Purple | published |
| Red | revision_needed |

Each day can also show:
- Shooting dates (from `shooting` category tasks) — shown with a camera icon
- Ad go-live dates (from `meta_ads_management` tasks) — shown with a megaphone icon
- Website go-live (from `web_development` phase completions)

**Filters available:**
- By platform (Instagram / Facebook / YouTube / Website)
- By content type (Reel / Static / Carousel / Meta Ad Creative / etc.)
- By status (draft / approved / scheduled / published)
- By assignee (which team member is working on it)
- By service type (Social Media / Meta Ads / Video / Graphics)

### 8.6 API Routes (Content Calendar)

| Method | Endpoint | Min Role | Purpose |
|--------|---------|---------|---------|
| POST | `/api/content` | project_manager, dept_head, smm | Create content item |
| GET | `/api/content` | team_member+ | List content items (filtered) |
| GET | `/api/content/:id` | team_member+ | Content item detail |
| PATCH | `/api/content/:id` | assigned, project_manager | Edit content item |
| PATCH | `/api/content/:id/status` | assigned (draft to review), pm (review to approved) | Status transition |
| POST | `/api/content/:id/approve` | project_manager, dept_head, admin | Approve content |
| POST | `/api/content/:id/reject` | project_manager, dept_head, admin | Reject with feedback |
| POST | `/api/content/:id/assets` | assigned | Upload visual assets |
| GET | `/api/projects/:id/calendar` | team_member+ | Calendar view for a project |
| GET | `/api/content/pending-approval` | project_manager, dept_head | Queue of items awaiting review |

---

## 9. Module 4: Task Management

### 9.1 Overview

Tasks are the atomic unit of work. They flow from projects and can also be standalone. Admins and PMs assign tasks; employees update them. Every task update is real-time via WebSocket.

### 9.2 Task Categories at ZRC

Every task has a `category` that tells the system what kind of work it is. This drives routing, reporting, and calendar display.

| Category Slug | Display | Typical Assignee | Example Task |
|--------------|---------|-----------------|-------------|
| `shooting` | Video / Photo Shoot | Cinematographer | Shoot product reel for [Client] — Friday 10am |
| `reel_editing` | Reel Editing | Video Editor | Edit 4 reels for [Client] — Week 2 June |
| `video_editing` | Video Editing (Long-form) | Video Editor | Cut brand film for [Client] — 60 sec version |
| `graphic_design` | Graphic Design | Graphic Designer | Design 12 static posts for [Client] — June batch |
| `carousel_design` | Carousel Design | Graphic Designer + Content Writer | Design 4 carousels for [Client] — Educational series |
| `meta_ad_creative` | Meta Ad Creative | Graphic Designer + Content Writer | Design 3 ad creatives for [Client] Facebook campaign |
| `meta_ads_management` | Meta Ads Management | Social Media Manager | Set up and launch [Client] May campaign in Meta Ads Manager |
| `caption_writing` | Caption Writing | Content Writer / SMM | Write captions for all June posts — [Client] |
| `ad_copy` | Ad Copy Writing | Content Writer | Write 3 ad copy variants for [Client] carousel ads |
| `content_planning` | Content Planning | Social Media Manager | Plan June content calendar for [Client] |
| `scheduling` | Content Scheduling | Social Media Manager | Schedule approved posts for [Client] — Week 1 |
| `web_development` | Web Development | Web Developer | Build contact page for [Client] website |
| `web_maintenance` | Website Maintenance | Web Developer | Monthly updates + backup for [Client] site |
| `client_report` | Client Report | PM / AM | Prepare May performance report for [Client] |
| `internal` | Internal Task | Any | Any internal non-client task |
| `review` | Review Task | PM / Dept Head | Review June creative batch for [Client] |

### 9.3 Task Data Model

| Field | Type | Description |
|-------|------|-------------|
| `taskId` | String | ZRC-TSK-00001 |
| `title` | String (required) | Task name |
| `description` | String | Full task brief |
| `category` | Enum | Task type (shooting/editing/design/etc.) |
| `projectId` | ObjectId → Project | Parent project (optional for standalone tasks) |
| `phaseId` | ObjectId → ProjectPhase | Which phase this task belongs to |
| `contentItemId` | ObjectId → ContentItem | Linked content item |
| `assignedTo` | Array[ObjectId → User] | Assignees (can be multiple) |
| `assignedBy` | ObjectId → User | Who assigned this task |
| `status` | Enum | todo / in_progress / review / revision_needed / done / cancelled |
| `priority` | Enum | low / medium / high / urgent |
| `dueDate` | Date | Deadline |
| `estimatedHours` | Number | Estimated effort |
| `actualHours` | Number | Logged actual hours |
| `startedAt` | Date | Auto-set when status moves to in_progress |
| `completedAt` | Date | Auto-set when status moves to done |
| `attachments` | Array | Deliverable files uploaded by assignee |
| `progressUpdates` | Array | Employee can log progress notes |
| `issueReports` | Array | Employee can flag issues |
| `submissionNote` | String | Note when submitting for review |
| `reviewNote` | String | PM feedback on review |
| `reviewedBy` | ObjectId → User | Who reviewed |
| `tags` | Array[String] | Custom labels |
| `isRecurring` | Boolean | Whether this task repeats |
| `recurringConfig` | Object | Frequency config for recurring tasks |
| `createdBy` | ObjectId → User | Who created the task |

### 9.4 Progress Update and Issue Report Sub-schemas

**Progress Update:**
- content (String), percentage (Number 0-100), attachments, createdBy, createdAt

**Issue Report:**
- title, description, severity (low/medium/high/blocking), attachments, status (open/resolved), resolvedBy, resolvedAt, createdBy, createdAt

### 9.5 Task Workflow Rules

1. Assignment: Only admin, project_manager, dept_head can create and assign tasks.
2. Status Updates: Employees can only update tasks assigned to them (todo to in_progress to review).
3. Review: PM/Dept Head can move review to done or revision_needed.
4. Issue Reports: Any assignee can file an issue. Blocking issues notify the PM immediately.
5. Recurring Tasks: Monthly content tasks can be set as recurring (auto-create each month).
6. Real-time Updates: Every status change emits a WebSocket event to the PM and all assignees.

### 9.6 API Routes (Tasks)

| Method | Endpoint | Min Role | Purpose |
|--------|---------|---------|---------|
| POST | `/api/tasks` | project_manager, dept_head, admin | Create task |
| GET | `/api/tasks` | Any staff | List tasks (scoped to assignee) |
| GET | `/api/tasks/:id` | Assignee, project_manager, admin | Task detail |
| PATCH | `/api/tasks/:id` | Assignee (limited), PM, admin | Edit task |
| PATCH | `/api/tasks/:id/status` | Assignee (limited transitions), PM | Update status |
| POST | `/api/tasks/:id/progress` | Assignee | Log progress update |
| POST | `/api/tasks/:id/issues` | Assignee | Report an issue |
| PATCH | `/api/tasks/:id/issues/:issueId` | PM, admin | Resolve issue |
| POST | `/api/tasks/:id/attachments` | Assignee | Upload deliverable |
| POST | `/api/tasks/:id/review` | project_manager, dept_head | Submit review (approve/reject) |
| GET | `/api/tasks/pending-review` | project_manager, dept_head | Queue of tasks in review |
| GET | `/api/tasks/my` | Any staff | Tasks assigned to me |
| GET | `/api/projects/:id/tasks` | team_member+ | All tasks in a project |

---

## 10. Module 5: Finance & Payments

### 10.1 Overview

Finance is a Day 1 core module. The three admins need to clearly see:
- How much money is expected each month (from contracts)
- How much has been received
- How much is still outstanding
- Per-client financial history

Critical Lesson from crmhrms: Finance was planned but never built. In ZRC CRM, Finance is built in Phase 1.

### 10.2 Invoice Model

| Field | Type | Description |
|-------|------|-------------|
| `invoiceId` | String | ZRC-INV-00001 |
| `clientId` | ObjectId → Client | Billed client |
| `projectId` | ObjectId → Project | Project (optional) |
| `invoiceNumber` | String | Human-readable: INV-2026-001 |
| `month` | Number | Billing month (1–12) |
| `year` | Number | Billing year |
| `lineItems` | Array | Individual service line items (description, serviceType, quantity, unitPrice, amount) |
| `subtotal` | Number | Sum of line items |
| `taxRate` | Number | GST % (e.g. 18) |
| `taxAmount` | Number | Auto-calculated |
| `totalAmount` | Number | subtotal + tax |
| `paidAmount` | Number | Total paid so far |
| `pendingAmount` | Number | Virtual: totalAmount - paidAmount |
| `status` | Enum | draft / sent / partial / paid / overdue / cancelled |
| `dueDate` | Date | Payment due date |
| `currency` | Enum | INR / USD / AED / GBP |
| `notes` | String | Invoice notes |
| `paymentTerms` | String | e.g. Net 30 |
| `sentAt` | Date | When invoice was sent to client |
| `paidAt` | Date | When fully paid |
| `createdBy` | ObjectId → User | Who created invoice |

### 10.3 Payment Model

| Field | Type | Description |
|-------|------|-------------|
| `paymentId` | String | ZRC-PAY-00001 |
| `invoiceId` | ObjectId → Invoice | Invoice being paid |
| `clientId` | ObjectId → Client | Paying client |
| `amount` | Number | Amount received |
| `currency` | String | Currency |
| `paymentDate` | Date | When payment was received |
| `paymentMethod` | Enum | bank_transfer / upi / cash / cheque / card / other |
| `transactionRef` | String | UTR / reference number |
| `notes` | String | Optional note |
| `loggedBy` | ObjectId → User | Staff member who logged this |
| `receiptUrl` | String | Uploaded receipt/screenshot |

### 10.4 Finance Dashboard (Admin View)

1. **Monthly Revenue Overview**
   - Expected this month (sum of all active client MRR)
   - Collected this month (sum of payments received this month)
   - Outstanding this month (expected - collected)
   - Overdue (invoices past due date)

2. **Client-wise Breakdown**
   - Table: Client Name, Service, Monthly Value, Paid, Outstanding, Status
   - Color coded: green (paid), amber (partial), red (overdue)

3. **Trends**
   - MRR trend chart (last 12 months)
   - Payment received chart
   - Outstanding aging (30/60/90+ days)

4. **Upcoming Renewals**
   - Contracts expiring in next 30 / 60 / 90 days

### 10.5 Business Rules

1. Only admin and account_manager can create invoices.
2. Invoices auto-populate from the client contract.monthlyValue and services.
3. Payment logging updates the parent invoice paidAmount and recalculates status.
4. When an invoice becomes overdue (past dueDate and not fully paid), the assigned account_manager and admins are notified.
5. Monthly invoices can be bulk-generated for all active clients on the 1st of each month (scheduled job).
6. Clients can see their invoice and payment history in the portal.

### 10.6 API Routes (Finance)

| Method | Endpoint | Min Role | Purpose |
|--------|---------|---------|---------|
| POST | `/api/invoices` | admin, account_manager | Create invoice |
| GET | `/api/invoices` | admin, account_manager | List invoices |
| GET | `/api/invoices/:id` | admin, account_manager (own) | Invoice detail |
| PATCH | `/api/invoices/:id` | admin, account_manager (own, draft only) | Edit invoice |
| POST | `/api/invoices/:id/send` | admin, account_manager | Mark as sent, notify client |
| POST | `/api/invoices/bulk-generate` | admin | Generate monthly invoices for all active clients |
| POST | `/api/payments` | admin, account_manager | Log payment |
| GET | `/api/payments` | admin | All payments |
| GET | `/api/clients/:id/financials` | admin, account_manager (own) | Client financial summary |
| GET | `/api/finance/dashboard` | admin | Finance dashboard data |
| GET | `/api/finance/outstanding` | admin | All outstanding invoices |
| GET | `/api/finance/monthly-summary` | admin | Monthly revenue breakdown |

---

## 11. Module 6: Client Portal

### 11.1 Overview

The client portal is a separate, branded, client-facing dashboard where clients log in using their email/password to see everything happening on their projects. Clients do not access the internal system — they see only a curated, trust-building view.

### 11.2 Portal Authentication

- Client uses email + password (set by admin on client creation).
- Client can reset password via email link.
- Session is JWT-based but stored separately from internal staff JWT.
- All portal API calls validate req.user.role === client and scope to req.user.linkedClientId.

### 11.3 Portal Pages

**Dashboard (Home)**
- Welcome: Welcome back, [Contact Name] from [Company Name]
- Active Projects: Progress ring cards (% complete, project name, PM name)
- Outstanding Payments: Highlighted card showing total pending with View Invoices CTA
- Recent Updates: Timeline of last 10 task completions and milestones
- Quick stats: Active projects, approved content pieces this month, pending invoices

**Projects**
- List of all client projects with status, progress bar, deadline
- Click into a project to see:
  - Overview Tab: Description, team members, timeline
  - Tasks Tab: Kanban view of tasks (read-only)
  - Content Calendar Tab: Approved and published content only
  - Timeline Tab: Milestones and key dates on a visual timeline
  - Files Tab: Documents shared by the team

**Finance / Invoices**
- All invoices (paid and pending)
- Payment history
- Outstanding balance prominently displayed
- Download invoice as PDF

**Messages / Chat**
- Real-time chat with the project team
- Client can message account manager and PM directly
- Messages scoped to their client context
- Supports file attachments

**Support Tickets**
- Raise a support ticket
- View open and resolved tickets
- Reply to staff messages on tickets

### 11.4 Client Portal Rules

1. Client can only see data where clientId matches linkedClientId on their user record.
2. Content items are only shown if clientFacing is true (PM decides what to share).
3. Internal notes (ClientNote with isVisibleToClient: false) are hidden.
4. Client cannot see other clients, team salary data, or internal communications.
5. If project requires client approval for content → client sees a pending approval queue in portal.

### 11.5 API Routes (Client Portal)

| Method | Endpoint | Role | Purpose |
|--------|---------|------|---------|
| GET | `/api/portal/dashboard` | client | Portal home data |
| GET | `/api/portal/projects` | client | My projects |
| GET | `/api/portal/projects/:id` | client | Project detail |
| GET | `/api/portal/projects/:id/tasks` | client | Project tasks (read-only) |
| GET | `/api/portal/projects/:id/calendar` | client | Content calendar (approved only) |
| GET | `/api/portal/projects/:id/files` | client | Project files |
| GET | `/api/portal/invoices` | client | My invoices |
| GET | `/api/portal/invoices/:id` | client | Invoice detail |
| POST | `/api/portal/content/:id/approve` | client | Approve content (if enabled) |
| POST | `/api/portal/content/:id/reject` | client | Reject content with feedback |
| GET | `/api/portal/messages` | client | Chat threads |
| POST | `/api/portal/messages` | client | Send message |
| POST | `/api/portal/tickets` | client | Raise support ticket |
| GET | `/api/portal/tickets` | client | My tickets |
| POST | `/api/portal/tickets/:id/reply` | client | Reply to ticket |

---

## 12. Module 7: Team Chat & Messaging

### 12.1 Channel Types

| Type | Description | Example |
|------|-------------|---------|
| `direct` | 1-on-1 DM between two staff members | DM between PM and Designer |
| `department` | All members of a department | social-media-team channel |
| `project` | All members of a project | zrc-client-name-project channel |
| `general` | Company-wide announcements | zrc-all-hands channel |
| `admin` | Admin-only channel | admin-ops channel |

### 12.2 Features

- Real-time via Socket.io
- File sharing — images, videos, documents
- @mentions — notify specific users
- Message reactions (emoji)
- Reply threads
- Message search
- Pin important messages
- Read receipts
- Unread counts

### 12.3 Project Chat Bridge

Each project automatically gets a channel of type project. When the client chats in the portal, their messages appear in this same channel (bridged), so the team sees client messages inline.

---

## 13. Module 8: Reports & Analytics

### 13.1 Report Categories

**Business Overview (Admin Only)**
- Total Active Clients
- Monthly Recurring Revenue (MRR) — current vs. last month
- Revenue Collected vs. Outstanding
- New Clients This Month
- Churned Clients This Month

**Project Health**
- Projects by status (planning/active/on_hold/completed/cancelled)
- On-time delivery rate (projects completed before/after deadline)
- Overdue projects list
- Project progress distribution

**Team Performance**
- Tasks completed per employee (this week / month)
- Average task turnaround time by category
- Revision rate (how often content is rejected)
- Issue reports filed (blocking issues per project)

**Content Analytics**
- Content published this month per platform
- Approval rate (approved first-time vs. required revisions)
- Scheduled vs. published on time

**Client Health**
- Client health scores
- Contracts expiring soon
- Clients with overdue invoices

### 13.2 Report Filters

All reports support filtering by: date range, client, project, department, team member.

---

## 14. Module 9: Notifications

### 14.1 Notification Triggers

| Trigger | Recipients |
|---------|-----------|
| Task assigned to you | Assignee(s) |
| Task status changed | PM + assignees |
| Issue reported (blocking) | PM, dept_head, admin |
| Content submitted for review | Reviewing PM/dept_head |
| Content approved | Content creator |
| Content rejected | Content creator |
| Client approved/rejected content | PM, account_manager |
| Invoice sent | Client (email) + admin |
| Payment received | Admin, account_manager |
| Invoice overdue | Account_manager + admin |
| Project status changed | PM + all team members |
| Contract expiring in 30 days | Account_manager + admin |
| New support ticket | Assigned staff + admin |
| New message (mention) | Mentioned user |
| Project milestone completed | PM + account_manager + admin |

### 14.2 Notification Delivery

1. In-app: Persisted to Notification collection. Delivered via Socket.io in real-time.
2. Email: For high-priority events (invoice overdue, blocking issue, contract renewal) — via Resend/SendGrid.
3. Unread count: Shown in bell icon in top navbar.
4. Mark all read / mark individual read support.

---

## 15. Module 10: Settings & Administration

### 15.1 User Management
- Create / deactivate staff accounts
- Assign roles and departments
- Reset passwords
- Set manager hierarchy (reportsTo)
- View employee profile and activity log

### 15.2 Role Management
- Roles stored in Role collection — not hardcoded
- Admins can add new roles without code changes
- Each role has: slug, displayName, level (1-10), description
- Module-level permissions per role

### 15.3 Department Management
- Create/edit departments
- Assign employees to departments
- Set department head

### 15.4 System Settings
- Company name, logo, timezone
- Email notification settings (toggle on/off per event type)
- Invoice settings (default tax rate, payment terms, currency)
- Portal settings (branding for client portal)
- Audit log viewer (admin only)

---

## 16. Technical Architecture

### 16.1 Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Backend** | Node.js + Express | Proven, fast, async I/O — same as crmhrms (works well) |
| **Database** | MongoDB + Mongoose | Flexible schema, great for JSON-heavy CRM data |
| **Real-time** | Socket.io | Chat + notifications — proven in crmhrms |
| **Authentication** | JWT (access + refresh tokens) | Stateless, scalable. Token versioning for invalidation |
| **File Storage** | Cloudinary / AWS S3 | For images, videos, documents |
| **Email** | Resend | Simple, reliable transactional email |
| **Job Scheduling** | node-cron | Monthly invoice generation, overdue checks, renewal alerts |
| **Frontend** | React 19 + Vite | Fast HMR, proven stack |
| **Frontend Styling** | Tailwind CSS v4 | Utility-first, consistent design system |
| **UI Components** | Radix UI + custom components | Accessible, composable primitives |
| **Charts** | Recharts | Finance and progress charts |
| **State Management** | Zustand + React Query | Lightweight global state + server state sync |
| **Icons** | Lucide React | Clean, consistent iconography |

### 16.2 Architecture Decisions

**Decision 1: Monorepo Structure**

```
zrcnewcrm/
├── server/
│   ├── models/
│   ├── controllers/
│   ├── services/
│   ├── routes/
│   ├── middleware/
│   ├── jobs/
│   ├── socket/
│   └── utils/
└── client/
    ├── src/
    │   ├── pages/
    │   ├── components/
    │   ├── contexts/
    │   ├── hooks/
    │   ├── services/
    │   └── stores/
    └── public/
```

**Decision 2: Separate Portal Route Tree**
The client portal is served from the same React app but uses a completely separate route tree (/portal/*). Portal API calls hit /api/portal/* endpoints which validate client role independently.

**Decision 3: Event-Driven Updates**
All cross-module side effects happen via an internal event bus (EventEmitter) in the service layer — not in controllers. This keeps controllers thin.

**Decision 4: No Sales Pipeline in Phase 1**
ZRC is not a cold-calling sales organization. The crmhrms system was over-complex because it tried to be a full sales CRM. ZRC starts with client management (manual onboarding by admin) and grows from there.

### 16.3 Security

| Concern | Solution |
|---------|---------|
| Authentication | JWT access token (15min) + refresh token (7d, httpOnly cookie) |
| Authorization | Role-based middleware (authorize(...)) on every route |
| Token invalidation | Token version in JWT; bumped on role/status change |
| NoSQL injection | express-mongo-sanitize on all request parsing |
| Rate limiting | Per-IP and per-user rate limiting via express-rate-limit |
| CSRF | SameSite cookie + CORS whitelist |
| File uploads | Type checking, size limits |
| Audit trail | All destructive actions logged to AuditLog collection |
| Client isolation | Every portal API validates clientId match — no cross-client data leak |

### 16.4 Real-time Architecture (Socket.io)

**Rooms:**
- Each user joins user:{userId} room on connect
- Each project has a project:{projectId} room — team members auto-join on connect
- Client portal users join client:{clientId} room

**Events emitted:**
- task:assigned → user:{assigneeId}
- task:status_changed → project:{projectId}
- task:issue_reported → user:{pmId}, user:{deptHeadId}
- content:submitted → user:{reviewerId}
- content:approved → user:{creatorId}
- content:rejected → user:{creatorId}
- payment:logged → user:{adminIds}
- invoice:overdue → user:{amId}, user:{adminIds}
- project:status_changed → project:{projectId}
- message:new → group:{groupId}
- notification:new → user:{userId}

---

## 17. Database Schema Reference

### Core Collections (20 focused models)

| Collection | Purpose |
|-----------|---------|
| `users` | All internal staff + client portal users |
| `roles` | Dynamic role definitions |
| `clients` | Client master records |
| `client_contacts` | Multiple contacts per client |
| `client_notes` | Client interaction log |
| `client_files` | Files associated with a client |
| `projects` | Project master records |
| `project_phases` | Phases within a project |
| `tasks` | All tasks (project + standalone) |
| `content_items` | Content calendar entries |
| `invoices` | Client invoices |
| `payments` | Payment receipts |
| `groups` | Chat channels/groups |
| `messages` | Chat messages |
| `support_tickets` | Client support tickets |
| `notifications` | In-app notification records |
| `audit_logs` | System audit trail |
| `counters` | Auto-ID sequence counters |
| `departments` | Department definitions |
| `project_templates` | Reusable project templates |

### Key Relationships

```
Client 1──* Project
Project 1──* ProjectPhase
Project 1──* Task
ProjectPhase 1──* Task
Project 1──* ContentItem
Task 0..1──1 ContentItem
Client 1──* Invoice
Invoice 1──* Payment
Client 1──* ClientContact
Client 1──* ClientNote
Client 1──1 User (portal)
Project 1──1 Group (chat channel)
```

---

## 18. API Surface (Route Map)

```
/api/auth                          — Login, logout, refresh token, password reset
/api/users                         — CRUD users (admin)
/api/roles                         — CRUD roles (admin)
/api/departments                   — CRUD departments (admin)

/api/clients                       — Client management
/api/clients/:id/contacts          — Client contacts
/api/clients/:id/notes             — Interaction log
/api/clients/:id/files             — Client files
/api/clients/:id/financials        — Financial summary

/api/projects                      — Project management
/api/projects/:id/phases           — Project phases
/api/projects/:id/tasks            — Project tasks
/api/projects/:id/calendar         — Combined calendar (content + tasks + milestones)
/api/projects/:id/members          — Team management
/api/projects/:id/financials       — Project financial data

/api/tasks                         — Task CRUD + workflow
/api/tasks/:id/progress            — Progress updates
/api/tasks/:id/issues              — Issue reports
/api/tasks/:id/review              — PM review actions

/api/content                       — Content calendar items
/api/content/:id/approve           — Approve content
/api/content/:id/reject            — Reject content
/api/content/:id/assets            — Upload assets

/api/invoices                      — Invoice management
/api/invoices/bulk-generate        — Monthly bulk invoice creation
/api/payments                      — Payment logging
/api/finance/dashboard             — Finance overview
/api/finance/monthly-summary       — Monthly breakdown

/api/groups                        — Chat groups/channels
/api/messages                      — Chat messages

/api/tickets                       — Support tickets (staff view)
/api/notifications                 — Notification management

/api/reports/business              — Business overview
/api/reports/projects              — Project health
/api/reports/team                  — Team performance
/api/reports/finance               — Financial reports
/api/reports/content               — Content analytics

/api/portal/dashboard              — Client portal home
/api/portal/projects               — Client portal projects
/api/portal/invoices               — Client portal invoices
/api/portal/messages               — Client portal chat
/api/portal/tickets                — Client portal tickets
/api/portal/content/:id/approve   — Client content approval
```

---

## 19. UI/UX Design Guidelines

### 19.1 Design Philosophy

Two distinct design contexts:

**Internal Dashboard** — Power user tool for the ZRC team
- Data-dense, scannable
- Dark mode preferred
- Sidebar navigation (collapsible)
- Status colors: emerald (done/paid), amber (pending/review), rose (overdue/blocked), sky (in_progress)

**Client Portal** — Trust-building, transparent, clean
- Light, professional
- ZRC brand colors
- Large metrics (outstanding payment amount in huge bold text)
- Minimal navigation (5 items max)
- Mobile-friendly — clients may access from phone

### 19.2 Color Palette

Internal Dashboard — Dark Mode Primary:
- bg-base: #0F172A (Deep Navy)
- bg-surface: #1E293B (Slate)
- bg-elevated: #334155 (Lighter slate)
- border: #475569
- text-primary: #F1F5F9
- text-secondary: #94A3B8
- accent: #6366F1 (Indigo)

Semantic Colors:
- success/paid/done: #10B981 (Emerald)
- warning/pending/review: #F59E0B (Amber)
- danger/overdue/blocked: #EF4444 (Rose)
- info/in_progress: #0EA5E9 (Sky)

Client Portal — Light Mode:
- portal-bg: #F8FAFC
- portal-surface: #FFFFFF
- portal-border: #E2E8F0
- portal-accent: #6366F1

### 19.3 Typography

- Font: Inter (Google Fonts)
- Headings: 600-700 weight
- Body: 400-500 weight
- Monospace (IDs, codes): JetBrains Mono

### 19.4 Key UI Patterns

| Pattern | Usage |
|---------|-------|
| **Kanban Board** | Task management (todo / in_progress / review / done columns) |
| **Monthly Calendar** | Content calendar drag-and-drop view |
| **Timeline/Gantt** | Project milestone and phase visualization |
| **Data Table** | Client list, invoice list — sticky headers, sortable, paginated |
| **Slide-out Drawer** | Quick edits (task status, log payment, add note) without leaving page |
| **Progress Ring** | Project % complete (client portal) |
| **Stat Cards** | Revenue, outstanding, MRR — top of finance dashboard |
| **Activity Feed** | Real-time notification stream |
| **Skeleton Loaders** | All data-heavy screens use shimmer loading |

### 19.5 Navigation Structure

**Internal App Sidebar:**
- Dashboard
- Clients
- Projects (All Projects, My Projects)
- Tasks (My Tasks, Review Queue)
- Content Calendar
- Finance (Invoices, Payments)
- Messages
- Reports
- Settings (admin)

**Client Portal Navigation:**
- Home
- Projects
- Invoices
- Messages
- Support

---

## 20. Implementation Roadmap

### Phase 1: Core Foundation (Weeks 1–4)

Goal: A working system where admins can manage clients, create projects, assign tasks, and track basic finances.

**Week 1: Project Setup + Auth + Users**
- Initialize monorepo (server + client)
- MongoDB connection, base Express app, Socket.io setup
- User model + Auth (JWT + refresh token)
- Role model (dynamic) + role middleware
- Basic admin UI: login, user management

**Week 2: Client Management**
- Client model + CRUD API
- Client contacts, notes, files sub-collections
- Account manager scoping
- Client list + detail pages (UI)
- Client portal user creation

**Week 3: Project Management**
- Project model + CRUD API
- ProjectPhase model
- Team member management
- Project list + detail pages (UI)
- Project Kanban and timeline view

**Week 4: Task Management + Finance**
- Task model + workflow API
- Progress updates + issue reports
- Invoice + Payment models + API
- Finance dashboard (UI)
- Task views (My Tasks, Kanban)

### Phase 2: Content Calendar + Notifications (Weeks 5–7)

Goal: Social media managers can plan and submit content. PMs can approve. Real-time notifications work.

**Week 5: Content Calendar**
- ContentItem model + CRUD API
- Approval workflow (submit, approve, reject)
- Monthly calendar view (UI)
- Asset upload (Cloudinary)

**Week 6: Notifications + Messaging**
- Notification model + Socket.io events
- Group/Message model + real-time chat
- Email notifications (Resend integration)
- Notification bell + drawer (UI)

**Week 7: Client Portal (Phase 1)**
- Portal routes (auth, project view, task view)
- Portal dashboard + project detail (UI)
- Client-side invoice view
- Client messaging

### Phase 3: Polish + Reports + Advanced Features (Weeks 8–10)

Goal: Reports give insights. Advanced content features work. System is production-ready.

**Week 8: Reports**
- Business overview report
- Project health report
- Finance report (monthly breakdown, aging)
- Content analytics

**Week 9: Advanced Features**
- Recurring tasks
- Bulk invoice generation (cron job)
- Contract renewal alerts (cron job)
- Client content approval in portal
- Support tickets (full)

**Week 10: Production Readiness**
- Security audit (rate limiting, CORS, helmet)
- Audit log implementation
- Performance optimization (indexes, query review)
- Error monitoring setup
- Deployment (Railway / Render + Vercel)

---

## 21. Open Questions

These items need clarification from the ZRC team before build begins:

| # | Question | Default Assumption |
|---|----------|-------------------|
| 1 | Will there be a leads/sales pipeline (like crmhrms) or do clients always enter manually by admin? | As of now, let's keep it manual. Only keep a space to enter thje details of the leads that will be avaialble to callers, admin, superadmin. 
| 2 | Who approves content The social media manager can, admin can, super admin can. 
| 3 | Should clients approve their content before it is posted, or is that only for some clients? No client approval via crm
| 4 | Are invoices generated per project or per client per month (covering all their projects)? | Per client per month (covering all active services) |
| 5 | Is the system in INR only or does ZRC have international clients requiring USD/AED billing? | Multi-currency (INR primary) |
| 6 | Should video editors and cinematographers track shoot schedules as calendar events, or just as tasks? | both calender and task
| 7 | Will there be employee attendance tracking (like crmhrms) or just task/project tracking? | Phase 1 is task-only.  
| 8 | Should account managers be able to create invoices independently, or is that admin-only? super admin only
| 9 | Is the client portal required from Day 1 ? day 1
| 10 | Are there recurring monthly projects (e.g., social media retainers that auto-renew tasks) or are all projects one-time? | Recurring retainers exist — recurring task feature is important |

---

*This PRD was prepared after a full audit of the existing crmhrms codebase. It is designed specifically for ZRC Media Network's digital marketing + software development business workflows.*

*Next Step: Review, answer the Open Questions in Section 21, and confirm the Phase 1 scope. Build begins once this PRD is approved.*
