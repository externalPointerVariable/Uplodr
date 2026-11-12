## S3 Public Access Fix - Make Bucket Public (User Preference)

**Status:** Planning → Implementation

### Steps:
1. **Update `backend/controllers/media.controller.js`** - Add PutObjectAclCommand to set ACL: 'public-read' after upload.
2. **Check/install deps** - `@aws-sdk/client-s3` (PutObjectAclCommand).
3. **Manual AWS Config** (User):
   - S3 Console → Bucket → Permissions → **Uncheck ALL Block Public Access** → Save.
   - Bucket Policy:
     ```
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Sid": "PublicReadGetObject",
           "Effect": "Allow",
           "Principal": "*",
           "Action": "s3:GetObject",
           "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
         }
       ]
     }
     ```
4. **Restart backend** (`npm start` or nodemon).
5. **Test**: Upload file → Dashboard → Click View → Opens/downloads directly.
6. **Cleanup**: Update this TODO.

**Security Note:** All objects with known URLs are publicly readable. Fine for demo/public app.

✅ **Step 1 Complete:** media.controller.js updated with public ACL.

**Remaining Steps:**
- [ ] **Step 2:** Restart backend: `cd Uplodr2/backend && npm start`
- [ ] **Step 3:** AWS Manual:
  | Action | Steps |
  |--------|-------|
  | Disable Block Public Access | S3 Console > Bucket > Permissions > Edit > Uncheck all > Save |
  | Add Bucket Policy | Edit policy > Paste JSON below > Save |
  ```
  {
    "Version": "2012-10-17",
    "Statement": [{ "Sid": "PublicReadGetObject", "Effect": "Allow", "Principal": "*", "Action": "s3:GetObject", "Resource": "arn:aws:s3:::YOUR_BUCKET/*" }]
  }
  ```
- [ ] **Step 4:** Test upload + View button

**Almost done!** Configure AWS → Test → Fixed.
