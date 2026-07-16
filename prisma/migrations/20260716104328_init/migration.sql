-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('MEMBER', 'ADMIN');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('RINGING', 'ONGOING', 'ENDED', 'DECLINED', 'MISSED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "public_number" VARCHAR(8) NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "nom" VARCHAR(100),
    "id_pays" SMALLINT,
    "type_compte" SMALLINT NOT NULL DEFAULT 0,
    "pseudo" VARCHAR(100),
    "avatar_url" VARCHAR(2048),
    "status_msg" VARCHAR(255),
    "last_seen" TIMESTAMPTZ,
    "is_online" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_devices" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "token" VARCHAR(512) NOT NULL,
    "platform" VARCHAR(16) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "push_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verifications" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'verification',
    "expires_at" TIMESTAMPTZ NOT NULL,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "contactId" UUID NOT NULL,
    "alias" VARCHAR(100),
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "is_group" BOOLEAN NOT NULL DEFAULT false,
    "name" VARCHAR(150),
    "avatar_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participants" (
    "userId" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "role" "ParticipantRole" NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_read_at" TIMESTAMPTZ,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("userId","conversationId")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "content" TEXT,
    "type" VARCHAR(20) NOT NULL DEFAULT 'text',
    "media_id" UUID,
    "reply_to_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_reads" (
    "userId" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "read_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_reads_pkey" PRIMARY KEY ("userId","messageId")
);

-- CreateTable
CREATE TABLE "message_hides" (
    "userId" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "hidden_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_hides_pkey" PRIMARY KEY ("userId","messageId")
);

-- CreateTable
CREATE TABLE "statuses" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "content" TEXT,
    "media_id" UUID,
    "type" VARCHAR(20) NOT NULL DEFAULT 'text',
    "background_color" VARCHAR(7),
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_views" (
    "id" UUID NOT NULL,
    "status_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "viewed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "status_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calls" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "initiator_id" UUID NOT NULL,
    "type" SMALLINT NOT NULL,
    "status" "CallStatus" NOT NULL DEFAULT 'RINGING',
    "sdp" TEXT,
    "ice_candidates" JSONB,
    "started_at" TIMESTAMPTZ,
    "ended_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_participants" (
    "id" UUID NOT NULL,
    "call_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'RINGING',
    "connected_at" TIMESTAMPTZ,
    "left_at" TIMESTAMPTZ,

    CONSTRAINT "call_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_files" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "provider" VARCHAR(20) NOT NULL DEFAULT 'local',
    "key" VARCHAR(512) NOT NULL,
    "conversation_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_threads" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(200),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ai_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" UUID NOT NULL,
    "thread_id" UUID NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pays" (
    "id_pays" SMALLSERIAL NOT NULL,
    "libelle" VARCHAR(200) NOT NULL,
    "prefix" VARCHAR(10) NOT NULL,
    "timeZone" VARCHAR(200) NOT NULL,
    "decalage_horaire" INTEGER NOT NULL,

    CONSTRAINT "pays_pkey" PRIMARY KEY ("id_pays")
);

-- CreateTable
CREATE TABLE "meeting" (
    "id_meeting" SERIAL NOT NULL,
    "id_organiser" UUID NOT NULL,
    "start_time" TIMESTAMPTZ NOT NULL,
    "duree" INTEGER NOT NULL,
    "objet" VARCHAR(200) NOT NULL,
    "room" VARCHAR(200) NOT NULL,
    "is_end" SMALLINT NOT NULL DEFAULT 0,
    "type_media" SMALLINT NOT NULL,

    CONSTRAINT "meeting_pkey" PRIMARY KEY ("id_meeting")
);

-- CreateTable
CREATE TABLE "participant" (
    "ID" SERIAL NOT NULL,
    "id_meeting" INTEGER NOT NULL,
    "id_participant" UUID NOT NULL,
    "status" SMALLINT NOT NULL DEFAULT 0,
    "start_time" TIMESTAMPTZ,
    "connecte" SMALLINT NOT NULL DEFAULT 0,
    "duree" INTEGER,

    CONSTRAINT "participant_pkey" PRIMARY KEY ("ID")
);

-- CreateTable
CREATE TABLE "blocked" (
    "id_block" SERIAL NOT NULL,
    "alanya_id" UUID NOT NULL,
    "id_caller_block" UUID NOT NULL,
    "date_block" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_pkey" PRIMARY KEY ("id_block")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_public_number_key" ON "users"("public_number");

-- CreateIndex
CREATE INDEX "users_public_number_idx" ON "users"("public_number");

-- CreateIndex
CREATE UNIQUE INDEX "push_devices_token_key" ON "push_devices"("token");

-- CreateIndex
CREATE INDEX "push_devices_userId_idx" ON "push_devices"("userId");

-- CreateIndex
CREATE INDEX "email_verifications_email_idx" ON "email_verifications"("email");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "contacts_userId_idx" ON "contacts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_userId_contactId_key" ON "contacts"("userId", "contactId");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_sender_id_idx" ON "messages"("sender_id");

-- CreateIndex
CREATE INDEX "statuses_user_id_expires_at_idx" ON "statuses"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "status_views_user_id_idx" ON "status_views"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "status_views_status_id_user_id_key" ON "status_views"("status_id", "user_id");

-- CreateIndex
CREATE INDEX "calls_conversation_id_status_idx" ON "calls"("conversation_id", "status");

-- CreateIndex
CREATE INDEX "calls_initiator_id_idx" ON "calls"("initiator_id");

-- CreateIndex
CREATE INDEX "call_participants_user_id_idx" ON "call_participants"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "call_participants_call_id_user_id_key" ON "call_participants"("call_id", "user_id");

-- CreateIndex
CREATE INDEX "media_files_owner_id_idx" ON "media_files"("owner_id");

-- CreateIndex
CREATE INDEX "media_files_conversation_id_idx" ON "media_files"("conversation_id");

-- CreateIndex
CREATE INDEX "ai_threads_user_id_idx" ON "ai_threads"("user_id");

-- CreateIndex
CREATE INDEX "ai_messages_thread_id_created_at_idx" ON "ai_messages"("thread_id", "created_at");

-- CreateIndex
CREATE INDEX "meeting_id_organiser_idx" ON "meeting"("id_organiser");

-- CreateIndex
CREATE INDEX "participant_id_participant_idx" ON "participant"("id_participant");

-- CreateIndex
CREATE UNIQUE INDEX "participant_id_meeting_id_participant_key" ON "participant"("id_meeting", "id_participant");

-- CreateIndex
CREATE INDEX "blocked_alanya_id_idx" ON "blocked"("alanya_id");

-- CreateIndex
CREATE UNIQUE INDEX "blocked_alanya_id_id_caller_block_key" ON "blocked"("alanya_id", "id_caller_block");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_id_pays_fkey" FOREIGN KEY ("id_pays") REFERENCES "pays"("id_pays") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_devices" ADD CONSTRAINT "push_devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_hides" ADD CONSTRAINT "message_hides_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_hides" ADD CONSTRAINT "message_hides_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statuses" ADD CONSTRAINT "statuses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statuses" ADD CONSTRAINT "statuses_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_views" ADD CONSTRAINT "status_views_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "statuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_views" ADD CONSTRAINT "status_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_initiator_id_fkey" FOREIGN KEY ("initiator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_participants" ADD CONSTRAINT "call_participants_call_id_fkey" FOREIGN KEY ("call_id") REFERENCES "calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_participants" ADD CONSTRAINT "call_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_threads" ADD CONSTRAINT "ai_threads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "ai_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting" ADD CONSTRAINT "meeting_id_organiser_fkey" FOREIGN KEY ("id_organiser") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant" ADD CONSTRAINT "participant_id_meeting_fkey" FOREIGN KEY ("id_meeting") REFERENCES "meeting"("id_meeting") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant" ADD CONSTRAINT "participant_id_participant_fkey" FOREIGN KEY ("id_participant") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked" ADD CONSTRAINT "blocked_alanya_id_fkey" FOREIGN KEY ("alanya_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked" ADD CONSTRAINT "blocked_id_caller_block_fkey" FOREIGN KEY ("id_caller_block") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
