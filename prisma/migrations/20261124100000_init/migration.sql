-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PracticeArea" AS ENUM ('SUCCESSION', 'DIVORCE', 'CHILD_SUPPORT', 'PARENTING', 'AGREEMENTS', 'OTHER');

-- CreateEnum
CREATE TYPE "Urgency" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- CreateEnum
CREATE TYPE "ContactChannel" AS ENUM ('WHATSAPP', 'PHONE', 'EMAIL');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'IN_REVIEW', 'CONTACTED', 'CLOSED', 'DISCARDED');

-- CreateEnum
CREATE TYPE "InquiryEventType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'NOTES_UPDATED');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('ADMIN');

-- CreateTable
CREATE TABLE "inquiries" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "phone" VARCHAR(30),
    "area" "PracticeArea" NOT NULL,
    "urgency" "Urgency" NOT NULL,
    "message" VARCHAR(2000) NOT NULL,
    "preferred_channel" "ContactChannel" NOT NULL,
    "safe_to_contact" BOOLEAN,
    "email_is_private" BOOLEAN NOT NULL,
    "consent_at" TIMESTAMP(3) NOT NULL,
    "privacy_policy_version" VARCHAR(20) NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "internal_notes" VARCHAR(5000),
    "ip_hash" VARCHAR(64),
    "source" VARCHAR(100),

    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiry_events" (
    "id" UUID NOT NULL,
    "inquiry_id" UUID NOT NULL,
    "type" "InquiryEventType" NOT NULL,
    "from_status" "InquiryStatus",
    "to_status" "InquiryStatus",
    "actor_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inquiry_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_members" (
    "id" UUID NOT NULL,
    "auth_user_id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "role" "StaffRole" NOT NULL DEFAULT 'ADMIN',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inquiries_status_created_at_idx" ON "inquiries"("status", "created_at");

-- CreateIndex
CREATE INDEX "inquiries_area_created_at_idx" ON "inquiries"("area", "created_at");

-- CreateIndex
CREATE INDEX "inquiries_created_at_idx" ON "inquiries"("created_at");

-- CreateIndex
CREATE INDEX "inquiry_events_inquiry_id_created_at_idx" ON "inquiry_events"("inquiry_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "staff_members_auth_user_id_key" ON "staff_members"("auth_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_members_email_key" ON "staff_members"("email");

-- AddForeignKey
ALTER TABLE "inquiry_events" ADD CONSTRAINT "inquiry_events_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "inquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
