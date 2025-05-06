const express = require("express");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const app = express();
const PORT = process.env.PORT;

const BUCKET_NAME = process.env.BUCKET_NAME;
const AWS_REGION = process.env.AWS_REGION;

app.use(express.json());

app.post("/start-backup-download", async (req, res) => {
  const { downloadUrl } = req.body;

  if (!downloadUrl) {
    return res.status(400).json({ error: "Download url is required" });
  }

  try {
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch backup: ${response.statusText}`);
    }

    const timeStamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `jira-backup-${timeStamp}.zip`;
    const filePath = path.join(__dirname, fileName);

    const fileStream = fs.createWriteStream(filePath);
    await new Promise((resolve, reject) => {
      response.body.pipe(fileStream);
      response.body.on("error", reject);
      fileStream.on("finish", resolve);
    });

    console.log(`Backup downloaded to ${filePath}`);

    // Upload the backup to S3
    const fileBuffer = fs.readFileSync(filePath);
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: fileBuffer,
      ContentType: "application/zip",
    };

    await new S3Client({ region: AWS_REGION }).send(
      new PutObjectCommand(uploadParams)
    );
    console.log(`Backup uploaded to S3 bucket ${BUCKET_NAME}`);
  } catch (error) {
    console.error("Error during backup download:", error);
    return res.status(500).json({ error: "Failed to start backup download" });
  }

  res.status(200).json({ message: "Backup downloaded and uploaded to S3" });
});

app.listen(PORT, () => {
  console.log(`EC2 backup handler listening on port ${PORT}`);
});
