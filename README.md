# Recordings Panel

This web site shows recordings for a PureCloud organization after authenticating with Azure Active Directory. It leverages Azure Functions which are described [here](https://bitbucket.org/eccemea/azure-recorder-collector/src/master/)

## Code structure

This uses the following frameworks/technologies:

- HTML/Javascript
- Angular
- Bootstrap

Code is commented. Main (and only) page is `index.html`.

All settings are in the `static/js/controller.js` file

- tenantId: Microsoft AD Tenant Id. Get it from your own Azure account
- clientId: Your own Azure App client id
- redirectUri: A URI that should also be present on your list of allowed redirect uris in your Azure app
- getConversationsApiKey: API key for the getConversations function
- getMediaInformationApiKey: API key for the getMediaInformation function
- getRecordingStreamApiKey: API key for the getRecordingStream function

Full instructions on how to implement the Azure functions are [here](https://bitbucket.org/eccemea/azure-recorder-collector/src/master/).

## TODOs

- Create Azure functions in your own Azure account and retrieve the API keys
- Update the API keys in the `static/js/controller.js` file
- Update the redirectUri variable with the path to the `index.html` file
- Read AD groups and pass them to the getConversations function (at the moment, using hardcoded values)
