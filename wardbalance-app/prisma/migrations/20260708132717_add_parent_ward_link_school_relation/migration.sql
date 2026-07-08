-- AddForeignKey
ALTER TABLE "ParentWardLink" ADD CONSTRAINT "ParentWardLink_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
