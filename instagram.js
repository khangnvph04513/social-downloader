const express = require('express');
const app = express();
const port = 8000;
const path = require('path');
const fetch = require("node-fetch");
const chalk = require("chalk");
const fs = require("fs");
const puppeteer = require('puppeteer');
const { exit } = require("process");
const { resolve } = require("path");
const { reject } = require("lodash");
const { Headers } = require('node-fetch');
const headers = new Headers();
headers.append('User-Agent', 'TikTok 26.2.0 rv:262018 (iPhone; iOS 14.4.2; en_US) Cronet');
const headersWm = new Headers();
headersWm.append('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36');

const axios = require('axios');
const cheerio = require('cheerio');

// const baseDownloadUrl = `http://localhost:${port}/downloads/{FILE_NAME}.mp4`;

// const baseDownloadUrl = `http://13.228.77.36:${port}/download-video/{FILE_NAME}`;
const baseDownloadUrl = `http://localhost:${port}/download-video/{FILE_NAME}`;

app.use('/downloads', express.static('downloads'));



app.get('/downloadPost', async (req, res) => {
  var listVideo = []
  const urls = req.query.urls.split(',');
  const data = await downloadFromURL(urls);
  return res.send({});
});



app.get('/download-video/:videoId', (req, res) => {
  var videoId = req.params.videoId;
  const videoPath = path.join(__dirname, `downloads/${videoId}.mp4`);
  res.setHeader('Content-Disposition', `attachment; filename=${videoId}.mp4`);
  res.sendFile(videoPath);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const getIdPostFromUrl = async (url) => {
  return url.split('/')[4]
}

const downloadImageFromPost = async (url, postId) => {
  const folder = "downloads/"
  const fileName = `${postId}.jpg`
  const downloadFile = fetch(url);
  console.log(downloadFile);
  const file = fs.createWriteStream(folder + fileName)

  downloadFile.then(res => {
    res.body.pipe(file)
    file.on("finish", () => {
      file.close()
      resolve()
    });
    file.on("error", (err) => reject(err));
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const downloadFromURL = async (urls) => {
  const browser = await puppeteer.launch({ headless: false });
  try {
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log("START PUPPERTER");
      
      const page = await browser.newPage();
      // Điều hướng đến trang web
      await page.goto(url);
      await page.waitFor(3000);
      // Chờ cho đến khi trang web hoàn tất quá trình load (có thể thay đổi thời gian chờ)
      await page.waitForSelector('img.x5yr21d.xu96u03.x10l6tqk.x13vifvy.x87ps6o.xh8yej3');

      // Lấy dữ liệu sau khi trang web đã load hoàn tất
      const srcValue = await page.$eval('img.x5yr21d.xu96u03.x10l6tqk.x13vifvy.x87ps6o.xh8yej3', (img) => img.getAttribute('src'));
      console.log('srcValue', srcValue);

      if (srcValue) {
        const postId = await getIdPostFromUrl(url);
        await downloadImageFromPost(srcValue, postId);
      }
    }
    return srcValue;
  } catch (error) {

  }
  finally {
    await browser.close();
  }

}