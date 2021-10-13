# YoutubeCatchUp

## To run this project

### Setup credentials
- Use [this wizard](https://console.developers.google.com/flows/enableapi?apiid=youtube) to create or select a project in the Google Developers Console and automatically turn on the API. Click Continue, then Go to credentials.
- On the Add credentials to your project page, click the Cancel button.
- At the top of the page, select the OAuth consent screen tab. Select an Email address, enter a Product name if not already set, and click the Save button.
- Select the Credentials tab, click the Create credentials button and select OAuth client ID.
- Select the application type Other, enter the name "YouTubeCatchUp", and click the Create button.
- Click OK to dismiss the resulting dialog.
- Click the file_download (Download JSON) button to the right of the client ID.
- Move the downloaded file to your working directory and rename it client_secrets.json.

### Run with node
- Clone the repo and move the client_secrets.json file into the same folder.
- Run 'npm install' to install the dependencies.
- Run 'npm start' to run the tool.
- The first time you run the file, it will prompt you to authorize access:
    - Browse to the provided URL in your web browser.
    - If you are not already logged into your Google account, you will be prompted to log in. If you are logged into multiple Google accounts, you will be asked to select one account to use for the authorization.
    - Click the Accept button.
    - Copy the code you're given, paste it into the command-line prompt, and press Enter.
- After running you can check your playlist and it will be updated with the latest uploads from the channels you provided.

## Note
Youtube appear to have a feature to add videos manually to a queue now, so it makes this sort of redundant. But still useful if you want to automate it.
