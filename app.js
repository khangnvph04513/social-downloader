const express = require('express');
const app = express();
const port = 8000;
const puppeteer = require('puppeteer');
const path = require('path');
const fetch = require("node-fetch");
const chalk = require("chalk");
const fs = require("fs");
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

// const baseDownloadVideoUrl = `http://13.228.77.36:${port}/download-video/{FILE_NAME}`;
// const baseDownloadImageUrl = `http://13.228.77.36:${port}/download-image/{FILE_NAME}`;
const baseDownloadVideoUrl = `http://localhost:${port}/download-video/{FILE_NAME}`;
const baseDownloadImageUrl = `http://localhost:${port}/download-image/{FILE_NAME}`;
app.use('/downloads', express.static('downloads'));

// ----------------------------------- TIKTOK -----------------------------

app.get('/tiktok/downloadVideo', async (req, res) => {
  try {
    var listVideo = []
    const url = await getRedirectUrl(req.query.urls);
    listVideo.push(url);
    const urls = req.query.urls.split(',')
    console.log('URL LIST', urls);
    return res.send(await downloadAndReturnLink(urls));
  } catch (error) {
    return res.send(error);
  }

});

app.get('/tiktok/downloadVideoByUsername', async (req, res) => {
  try {
    var username = req.query.username;
    const urls = await getListVideoFromUsername(username);
    console.log('URL LIST', urls);

    return res.send(await downloadAndReturnLink(urls));
  } catch (error) {
    return res.send(error);
  }
});

// ----------------------------------- INSTAGRAM -----------------------------
app.get('/instagram/downloadPost', async (req, res) => {
  var listVideo = []
  const urls = req.query.urls.split(',');
  const download = await downloadInstagramImageFromURL(urls);
  return res.send(download);
});
// ---------------------------- GET DOWNLOAD LINK ----------------------------------------
app.get('/download-video/:videoId', (req, res) => {
  var videoId = req.params.videoId;
  const videoPath = path.join(__dirname, `downloads/${videoId}.mp4`);
  res.setHeader('Content-Disposition', `attachment; filename=${videoId}.mp4`);
  res.sendFile(videoPath);
});

app.get('/download-image/:imageId', (req, res) => {
  const extension = 'jpg';
  var imageId = req.params.imageId;
  const videoPath = path.join(__dirname, `downloads/${imageId}.${extension}`);
  res.setHeader('Content-Disposition', `attachment; filename=${imageId}.${extension}`);
  res.sendFile(videoPath);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const downloadAndReturnLink = async (urls) => {
  let response = ``;
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const videoId = await startDownload(url);
    const downloadLink = baseDownloadVideoUrl.replace('{FILE_NAME}', videoId);
    response += `<a href="${downloadLink}">${downloadLink}<a/></br>`;
    if (i > 10) {
      break;
    }
  }
  return response;
}

const getVideoWM = async (url) => {
  const idVideo = await getIdVideo(url)
  const API_URL = `https://api16-normal-c-useast1a.tiktokv.com/aweme/v1/feed/?aweme_id=${idVideo}`;
  const request = await fetch(API_URL, {
    method: "GET",
    headers: headers
  });
  const body = await request.text();
  try {
    var res = JSON.parse(body);
  } catch (err) {
    console.error("Error:", err);
    console.error("Response body:", body);
  }
  const urlMedia = res.aweme_list[0].video.download_addr.url_list[0]
  const data = {
    url: urlMedia,
    id: idVideo
  }
  return data
}
const getIdVideo = (url) => {
  const matching = url.includes("/video/")
  if (!matching) {
    console.log(chalk.red("[X] Error: URL not found"));
    exit();
  }
  const idVideo = url.substring(url.indexOf("/video/") + 7, url.length);
  return (idVideo.length > 19) ? idVideo.substring(0, idVideo.indexOf("?")) : idVideo;
}

const getVideoNoWM = async (url) => {
  const idVideo = await getIdVideo(url)
  const API_URL = `https://api16-normal-c-useast1a.tiktokv.com/aweme/v1/feed/?aweme_id=${idVideo}`;
  const request = await fetch(API_URL, {
    method: "GET",
    headers: headers
  });
  const body = await request.text();
  try {
    var res = JSON.parse(body);
  } catch (err) {
    console.error("Error:", err);
    console.error("Response body:", body);
  }
  const urlMedia = res.aweme_list[0].video.play_addr.url_list[0]
  const data = {
    url: urlMedia,
    id: idVideo
  }
  return data
}

const getRedirectUrl = async (url) => {
  if (url.includes("vm.tiktok.com") || url.includes("vt.tiktok.com")) {
    url = await fetch(url, {
      redirect: "follow",
      follow: 10,
    });
    url = url.url;
    console.log(chalk.green("[*] Redirecting to: " + url));
  }
  return url;
}
const downloadMediaFromList = async (list) => {
  const folder = "downloads/"
  list.forEach((item) => {
    const fileName = `${item.id}.mp4`
    const downloadFile = fetch(item.url)
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
  });
}

const startDownload = async (urlInput) => {

  var listVideo = [];
  var listMedia = [];
  const url = await getRedirectUrl(urlInput);
  listVideo.push(url);
  console.log(chalk.green(`[!] Found ${listVideo.length} video`));
  console.log(listVideo);
  for (var i = 0; i < listVideo.length; i++) {
    console.log(chalk.green(`[*] Downloading video ${i + 1} of ${listVideo.length}`));
    console.log(chalk.green(`[*] URL: ${listVideo[i]}`));
    var data = await getVideoNoWM(listVideo[i]);
    listMedia.push(data);
  }
  downloadMediaFromList(listMedia)
    .then(() => {
      console.log(chalk.green("[+] Downloaded successfully"));
    })
    .catch(err => {
      console.log(chalk.red("[X] Error: " + err));
    });
  return await getIdVideo(listVideo[0]);
}


const getListVideoFromUsername = async (username) => {
  console.log(`START DOWNLOAD USER ${username}`);
  const url = `https://www.tiktok.com/${username}`;
  console.log(url);
  return axios.get(url)
    .then(async (response) => {
      await sleep(5000)
      const $ = cheerio.load(response.data);
      const start = response.data.indexOf('"user-post":{"list":["') + 21
      const end = response.data.indexOf('],"browserList":["');
      console.log({ start, end });
      const idArrays = response.data.substr(start, end - start).replaceAll('"', '').split(',');
      const urlArrays = [];
      idArrays.forEach(videoId => {
        urlArrays.push(`https://www.tiktok.com/${username}/video/${videoId}`)
      });
      console.log('urlArrays', urlArrays);
      return urlArrays;
    })
    .catch((error) => {
      console.error('Error:', error);
    });

}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const downloadInstagramImageFromURL = async (urls) => {
  let downloadUrls = '';
  const browser = await puppeteer.launch({ headless: true });
  try {
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log("START PUPPERTER");

      const page = await browser.newPage();
      // Điều hướng đến trang web
      await page.goto(url);
      await page.waitForTimeout(3000);
      // Chờ cho đến khi trang web hoàn tất quá trình load (có thể thay đổi thời gian chờ)
      await page.waitForSelector('img.x5yr21d.xu96u03.x10l6tqk.x13vifvy.x87ps6o.xh8yej3');

      // Lấy dữ liệu sau khi trang web đã load hoàn tất
      const srcValue = await page.$eval('img.x5yr21d.xu96u03.x10l6tqk.x13vifvy.x87ps6o.xh8yej3', (img) => img.getAttribute('src'));
      console.log('srcValue', srcValue);

      if (srcValue) {
        const postId = await getIdPostFromUrl(url);
        const downloadLink = baseDownloadImageUrl.replace('{FILE_NAME}', postId);
        console.log('downloadLink', downloadLink);
        downloadUrls += `<a href="${downloadLink}">${downloadLink}<a/></br>`;;
        await downloadImageFromPost(srcValue, postId);
      }
    }
    return downloadUrls;
  } catch (error) {
    console.log(error);
    throw error;
  }
  finally {
    await browser.close();
  }

}

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