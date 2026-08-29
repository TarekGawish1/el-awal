
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");

const s3 = new S3Client({
  region: "auto",
  endpoint: "https://b8a453748c281b051559607a0c96df23.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: "0047012a25db38536053874dd05b9bd3",
    secretAccessKey: "7a1c6e355ad444aac9e7a9073443a35cf9713a33e0f56e92e403120a5eee7b01",
  },
});

const uploadImages = async () => {
  const dirPath = "d:\\el_awal\\apps\\web\\public\\about_us";
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    if (file.endsWith(".webp")) {
      const filePath = path.join(dirPath, file);
      const fileBuffer = fs.readFileSync(filePath);
      const uploadParams = {
        Bucket: "elawalbucket",
        Key: `about_us/${file}`,
        Body: fileBuffer,
        ContentType: "image/webp",
      };

      try {
        await s3.send(new PutObjectCommand(uploadParams));
        console.log(`Uploaded ${file}`);
      } catch (err) {
        console.error("Error uploading", file, err);
      }
    }
  }
};

uploadImages();

