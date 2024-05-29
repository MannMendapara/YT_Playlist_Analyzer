#!/usr/bin/env node
//? Above Line of code used to make our commands Accessible Globally.

const puppeteer = require("puppeteer");
const pdf = require("pdfkit");
const fs = require("fs");
const { exit } = require("process");
const path = require("path");

const inputArguments = process.argv.slice(2);

// Link for youtube Playlist, Current path and Destination path from CLA.
const YT_Link = inputArguments[0];
const DestinationPath = inputArguments[1];
const CurrentPath = process.cwd();
let cTab;

(async function () {
  try {
    // For Launching the Browser
    let browserOpen = puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ["--start-maximized"],
    });
    let browserInstance = await browserOpen;

    // Get the all tabs that currently opened
    let allTabs = await browserInstance.pages();

    //Choose the First
    cTab = allTabs[0];

    if (isValidYouTubePlaylistURL(YT_Link)) {
      //Then Request for the Yt playlist
      if (DestinationPath) {
        if (!fs.existsSync(DestinationPath)) {
          console.log("Invalid Destination Path");
          exit();
        }
      }

      try {
        await cTab.goto(YT_Link);
      } catch (e) {
        console.log("invalid URL");
        exit();
      }

      // Request for the selector of playlist name
      await cTab.waitForSelector("h1#title");

      // Scrape the name of Playlist
      let name = await cTab.evaluate(function (select) {
        return document.querySelector(select).innerText;
      }, "h1#title");

      // Scrape the no of videos and views
      let noOfVideoViews = await cTab.evaluate(
        getData,
        "#stats .style-scope.ytd-playlist-sidebar-primary-info-renderer"
      );

      let ChannelName = await cTab.evaluate(getChannelName,'#owner-text.style-scope.ytd-playlist-header-renderer')

      let totalVideos = noOfVideoViews.noOfVideos.split(" ")[0];

      // Determine the total videos that can fetched one time without scrolling. After some scrolling we have to wait for some times to load more video
      // This variable shows that how many videos is loaded.
      let currentVideos = await getCurrentVideosLength();

      // Implement Scroll till end of Playlist
      while (totalVideos - currentVideos >= 20) {
        await scrollToBottom();
        currentVideos = await getCurrentVideosLength();
      }

      // Gives final List Of videos.
      let Stats = await getStats();

      let AvgTimeAndTotalTime = calculatePlaylistStats(Stats);
      createPDF(name, ChannelName, noOfVideoViews, Stats, AvgTimeAndTotalTime);
    } else {
      console.log("Not Youtube Playlist URL");
      exit();
    }
  } catch (e) {
    console.error(e);
  }
})();

// Function for check is the valid youtube url or not
function isValidYouTubePlaylistURL(url) {
  const playlistURLPattern =
    /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(playlist\?list=|embed\/videoseries\?list=)([A-Za-z0-9_-]+)$/;
  return playlistURLPattern.test(url);
}

// For Fetching No. of videos and No. of views
function getData(selector) {
  let allElements = document.querySelectorAll(selector);
  let noOfVideos = allElements[0].innerText;
  let noOfViews = allElements[1].innerText;
  return {
    noOfViews: noOfViews,
    noOfVideos: noOfVideos,
  };
}

//Get Channel name
async function getChannelName(ChannelNameSelector){
  let ChannelNameElement = document.querySelector(ChannelNameSelector);
  return ChannelNameElement.innerText;
}

// For get the videos in current page.
async function getCurrentVideosLength() {
  let length = cTab.evaluate(
    getLength,
    "#container>#thumbnail span.style-scope.ytd-thumbnail-overlay-time-status-renderer"
  );
  function getLength(durationSelector) {
    let durationElements = document.querySelectorAll(durationSelector);
    return durationElements.length;
  }
  return length;
}

// For Scrolling
async function scrollToBottom() {
  await cTab.evaluate(goToBottom);
  function goToBottom() {
    window.scrollBy(0, window.innerHeight);
  }
}

async function getStats() {
  let videoList = cTab.evaluate(
    getNameAndDuration,
    "#video-title",
    "#container>#thumbnail span.style-scope.ytd-thumbnail-overlay-time-status-renderer",
    "#metadata>#video-info span.style-scope.yt-formatted-string"
  );
  return videoList;
}

// For video title and video duration
function getNameAndDuration(VideoSelector, DurationSelector, ViewSelector) {
  let videoElementTitles = document.querySelectorAll(VideoSelector);
  let videoElementsDuration = document.querySelectorAll(DurationSelector);
  let videoElementViews = document.querySelectorAll(ViewSelector);
  let VideoList = [];
  for (let i = 0; i < videoElementsDuration.length; i++) {
    let videoTitle = videoElementTitles[i].innerText;
    let videoDuration = videoElementsDuration[i].innerText;
    VideoList.push({ videoTitle: videoTitle, videoDuration: videoDuration });
  }

  return VideoList;
}

// Function for calculate the total time and avg time
function calculatePlaylistStats(Stats) {
  const totalVideos = Stats.length;
  const totalDurationInSeconds = getTotalDurationInSeconds(Stats);
  function getTotalDurationInSeconds(Stats) {
    let totalDurationInSeconds = 0;
    Stats.forEach((video) => {
      let parts = video.videoDuration.trim().split(":").map(Number);
      let [second, minute, hour = 0] = parts.reverse();
      totalDurationInSeconds += hour * 3600 + minute * 60 + second;
    });
    return totalDurationInSeconds;
  }

  // Convert total duration to hh/mm/ss format
  const totalHours = Math.floor(totalDurationInSeconds / 3600);
  const totalMinutes = Math.floor((totalDurationInSeconds % 3600) / 60);
  const totalSeconds = Math.floor(totalDurationInSeconds % 60);

  // Calculate average video time in seconds
  const averageTimePerVideoSeconds = totalDurationInSeconds / totalVideos;

  // Convert average time per video to mm/ss format
  const averageMinutesPerVideo = Math.floor(averageTimePerVideoSeconds / 60);
  const averageSecondsPerVideo = Math.round(averageTimePerVideoSeconds % 60);

  return {
    totalHours: totalHours,
    totalMinutes: totalMinutes,
    totalSeconds: totalSeconds,
    averageMinutes: averageMinutesPerVideo,
    averageSeconds: averageSecondsPerVideo,
  };
}

function createPDF(name, ChannelName, noOfVideoViews, Stats, AvgTimeAndTotalTime) {
  let doc = new pdf();
  let filePath;

  if (DestinationPath) {
    // If destination path is provided and exists, set the file path accordingly
    filePath = path.join(DestinationPath, `${name}.pdf`);
  } else {
    // If destination path is not provided or invalid, set the file path to current directory
    filePath = path.join(CurrentPath, `${name}.pdf`);
  }

  if (fs.existsSync(filePath)) {
    // If file exists, remove it
    fs.unlinkSync(filePath);
  }

  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(22).text(name, { align: "center" });

  doc.moveDown();
  doc.fontSize(16).text(`Channel Name: ${ChannelName}`)
  doc.text(`Number of Videos: ${noOfVideoViews.noOfVideos}`);
  doc.text(`Number of Views: ${noOfVideoViews.noOfViews}`);
  doc.text(
    `Total Time: ${AvgTimeAndTotalTime.totalHours} hr ${AvgTimeAndTotalTime.totalMinutes} min ${AvgTimeAndTotalTime.totalSeconds} sec`
  );
  doc.text(
    `Average time per video: ${AvgTimeAndTotalTime.averageMinutes} min ${AvgTimeAndTotalTime.averageSeconds} sec`
  );

  doc.moveDown();
  doc.fontSize(19).text("Details of Videos: ", { underline: true });

  Stats.forEach((video, index) => {
    doc.moveDown();
    doc
      .fontSize(12)
      .text(`${index + 1}. ${video.videoTitle}`, { continued: true });
    doc.fontSize(12).text(`${video.videoDuration}`, { align: "right" });
  });

  doc.end();

  console.log("Playlist Analyses over");
  console.log(
    "Pdf created successfully at ",
    DestinationPath ? DestinationPath : CurrentPath,
    ` as ${name}.pdf`
  );
}
