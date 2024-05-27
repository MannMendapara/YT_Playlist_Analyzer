const puppeteer = require('puppeteer')
const pdf = require('pdfkit')
const fs = require('fs')

// Link for youtube Playlist
let YT_Link = 'https://www.youtube.com/playlist?list=PL-Jc9J83PIiEeD3I4VXETPDmzJ3Z1rWb4'
let cTab;

(async function(){
    try {
        // For Launching the Browser
        let browserOpen = puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: ['--start-maximized'],
        })
        let browserInstance = await browserOpen;

        // Get the all tabs that currently opened
        let allTabs = await browserInstance.pages();

        //Choose the First
        cTab = allTabs[0];

        //Then Request for the Yt playlist
        await cTab.goto(YT_Link)

        // Request for the selector of playlist name
        await cTab.waitForSelector('h1#title')

        // Scrape the name of Playlist
        let name = await cTab.evaluate(function(select){return document.querySelector(select).innerText},'h1#title')
        console.log(name);

        // Scrape the no of videos and views
        let noOfVideoViews = await cTab.evaluate(getData, '#stats .style-scope.ytd-playlist-sidebar-primary-info-renderer')
        console.log(noOfVideoViews);

        let totalVideos = noOfVideoViews.noOfVideos.split(" ")[0]
        console.log(totalVideos);

        // Determine the total videos that can fetched one time without scrolling. After some scrolling we have to wait for some times to load more video
        // This variable shows that how many videos is loaded.
        let currentVideos = await getCurrentVideosLength();

        // Implement Scroll till end of Playlist
        while((totalVideos-currentVideos) >= 20){
            await scrollToBottom()
            currentVideos = await getCurrentVideosLength()
        }

        // Gives final List Of videos.
        let Stats = await getStats();

        let pdfDocs = new pdf
        pdfDocs.pipe(fs.createWriteStream(`${name}.pdf`));
        pdfDocs.text(JSON.stringify(Stats));
        pdfDocs.end();
        
    }catch(e){
        console.error(e);
    }
})()

// For Fetching No. of videos and No. of views
function getData(selector){
    let allElements = document.querySelectorAll(selector);
    let noOfVideos = allElements[0].innerText;
    let noOfViews = allElements[1].innerText;
    return {
        noOfViews: noOfViews,
        noOfVideos: noOfVideos
    }
}

// For get the videos in current page.
async function getCurrentVideosLength(){
    let length = cTab.evaluate(getLength,'#container>#thumbnail span.style-scope.ytd-thumbnail-overlay-time-status-renderer')
    function getLength(durationSelector){
        let durationElements = document.querySelectorAll(durationSelector);
        return durationElements.length
    }
    return length;
}

// For Scrolling 
async function scrollToBottom(){
    await cTab.evaluate(goToBottom)
    function goToBottom(){
        window.scrollBy(0, window.innerHeight)
    }
}

async function getStats(){
    let videoList = cTab.evaluate(getNameAndDuration,'#video-title', '#container>#thumbnail span.style-scope.ytd-thumbnail-overlay-time-status-renderer')
    return videoList;
}

// For video title and video duration
function getNameAndDuration(VideoSelector, DurationSelector){
    let videoElementTitles = document.querySelectorAll(VideoSelector)
    let videoElementsDuration = document.querySelectorAll(DurationSelector)

    let VideoList = [];
    for(let i = 0; i < videoElementsDuration.length; i++){
        let videoTitle = videoElementTitles[i].innerText;
        let videoDuration = videoElementsDuration[i].innerText;
        VideoList.push({videoTitle: videoTitle, videoDuration: videoDuration})
    }

    return VideoList;
}