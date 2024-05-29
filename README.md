# YT Playlist Analyzer

This project uses browser automation and web scraping to generate a detailed analysis of a YouTube playlist. The analysis includes the total duration of the playlist, the average time per video, and individual video details such as title, duration, and views. The generated analysis is saved as a PDF file.

## Technologies Used
- **Puppeteer:** For browser automation and web scraping.
- **NodeJS:** For server-side scripting.
- **pdfkit:** For generating PDF files.
- **fs (File System):** For handling file operations.
- **path:** For handling and transforming file paths.

## Usage
You can use this application via the command line interface (CLI) by providing a YouTube playlist link and optionally a destination path for the generated PDF.

### Commands
1. **YouTube 'Playlist Link' 'Destination Path'**
   - Generates an analysis PDF at the specified destination path.
   
2. **YouTube 'Playlist Link'**
   - Generates an analysis PDF at the current CLI path.

## Steps to Use

1. **Clone the repository.**
   - Clone the repository to your local machine:
   
   ```bash
   git clone https://github.com/MannMendapara/YT_Playlist_Analyzer
   cd YT_Playlist_Analyzer

2. **Install the required packages.**
   - Run the following command to install all necessary dependencies:

   ```bash
   npm install

3. **Make the command globally accessible.**
   - Link the CLI script globally to make the command available system-wide:
  
   ```bash
   npm link

4. **Execute the command.**
   - Open CMD or any CLI from any path and execute the command with your desired YouTube playlist link and destination path:
  
   ```bash
   YouTube 'Playlist Link' 'Destination Path'
