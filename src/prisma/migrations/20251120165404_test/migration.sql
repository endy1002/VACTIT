-- CreateTable
CREATE TABLE "User" (
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL,
    "membership" TEXT NOT NULL DEFAULT 'Regular',
    "created_at" TIMESTAMP(3) NOT NULL,
    "hash_password" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "Test" (
    "test_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "start_time" TIMESTAMP(3),
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Regular',
    "due_time" TIMESTAMP(3),
    "url" TEXT NOT NULL,
    "duration" INTEGER,

    CONSTRAINT "Test_pkey" PRIMARY KEY ("test_id")
);

-- CreateTable
CREATE TABLE "Trial" (
    "trial_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "test_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "raw_score" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "processed_score" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "tactic" JSONB,

    CONSTRAINT "Trial_pkey" PRIMARY KEY ("trial_id")
);

-- CreateTable
CREATE TABLE "Response" (
    "trial_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "chosen_option" TEXT,
    "response_time" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "Response_pkey" PRIMARY KEY ("trial_id","question_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trial" ADD CONSTRAINT "Trial_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trial" ADD CONSTRAINT "Trial_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "Test"("test_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_trial_id_fkey" FOREIGN KEY ("trial_id") REFERENCES "Trial"("trial_id") ON DELETE CASCADE ON UPDATE CASCADE;
