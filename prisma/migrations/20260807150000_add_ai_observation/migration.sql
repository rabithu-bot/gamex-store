-- CreateTable
CREATE TABLE "AiObservation" (
    "id" SERIAL NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerMessage" TEXT NOT NULL,
    "customerAttachmentType" TEXT,
    "adminReply" TEXT NOT NULL,
    "adminAttachmentType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiObservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiObservation_orderId_idx" ON "AiObservation"("orderId");
