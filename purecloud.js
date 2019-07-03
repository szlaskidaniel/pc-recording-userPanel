angular.module('recordingApp', [])
  .controller('purecloudController', function ($scope) {
    var _self = this;

    let redirectUri = 'https://szlaskidaniel.github.io/pc-recording-userPanel/index.html';
    let clientId = '89f29367-dc0e-4fd0-9f55-7175a73ee600';
    let environment = 'mypurecloud.ie'
    const platformClient = require('platformClient');


    const client = platformClient.ApiClient.instance
    client.setPersistSettings(true);
    // Set Environment (in case page reloaded)
    client.setEnvironment(environment);

    let apiUsers = new platformClient.UsersApi();
    let apiAnalytics = new platformClient.AnalyticsApi();
    let apiRecordings = new platformClient.RecordingApi();

    client.loginImplicitGrant(clientId, redirectUri)
      .then(() => {
        console.log('user authenticated');
        getMe().then(function (getMeResponse) {
          console.log('userId', getMeResponse.userId);
          $("#orgDetails").text(`${getMeResponse.orgName}`);

          getAnalyticsConversationDetails();
          //getConversationRecordingMetadata('')

        }).catch(function (err) {

        })

      })
      .catch((err) => {
        // Handle failure response
        console.log(err);
      });

    $scope.setCurrentConversation = function (item) {
      _self.selectedConversation = item;
      console.log(`setCurrentConversation2 to ${item.conversationId}`);
      getRecordingConversationId(item.conversationId)
    }

    /*
  _self.setCurrentConversation = function (item) {
    _self.selectedConversation = item;
    $scope.$apply();
    console.log(`setCurrentConversation to ${_self.selectedConversation.conversationId}`);
  };
*/
    function getMe() {
      console.log('getMe');
      return new Promise(function (resolve, reject) {
        try {
          apiUsers.getUsersMe({ "expand": ["organization"] })
            .then((data) => {
              //console.log(`getUsersMe success! data: ${JSON.stringify(data, null, 2)}`);
              console.log('getUsersMe success!');
              let ret = {
                "userId": data.id,
                "userName": data.name,
                "orgName": data.organization.name
              }
              resolve(ret);
            })
            .catch((err) => {
              console.log('There was a failure calling getUsersMe');
              console.error(err);
              reject(err);
            });
        } catch (error) {
          console.error(error);
          reject(error);
        }
      });
    }


    function getAnalyticsConversationDetails() {
      console.log('getAnalyticsConversationDetails');

      let body = {
        "interval": "2018-03-02T23:00:00.000Z/2018-03-08T23:00:00.000Z",
        "order": "asc",
        "orderBy": "conversationStart",
        "paging": { "pageSize": 50, "pageNumber": 1 },
        "segmentFilters": [
          {
            "type": "or",
            "predicates":
              [{ "dimension": "mediaType", "value": "mediaType", "operator": "matches", "value": "voice" }]
          }],
      }


      apiAnalytics.postAnalyticsConversationsDetailsQuery(body)
        .then((data) => {
          console.log(`postAnalyticsConversationsDetailsQuery success! data: ${JSON.stringify(data, null, 2)}`);
          showSpinner('spinnerMain', false);
          _self.conversations = data.conversations;
          $scope.$applyAsync();

        })
        .catch((err) => {
          console.log('There was a failure calling postAnalyticsConversationsDetailsQuery');
          console.error(err);
        });

    }

    function getConversationRecording(_conversationId, _recordingId, _attemptNo) {
      showSpinner('spinner', true);
      if (!_attemptNo) _attemptNo = 0;
      if (_attemptNo > 3) {
        console.log('failed to get audioFile');
        _self.audioFile = "";
        $("#audioPlayer").load();
        _self.audioFileState = "Failed to download";
        $scope.$applyAsync();

      }
      console.log(`getConversationRecording mediaFile for conversationId ${_conversationId} and recordingId ${_recordingId} - attemptNo: [${_attemptNo}]`);

      let opts = {
        'formatId': "mp3", // String | The desired media format. WEBM was a default & works only in Chrome (no Safari)
        'download': true, // Boolean | requesting a download format of the recording            
        'filename': "audio"
      };

      apiRecordings.getConversationRecording(_conversationId, _recordingId, opts)
        .then((data) => {
          console.log(`getConversationRecording success!`);
          console.log(data);

          try {
            if (data && data.mediaUris.S.mediaUri) {
              // Assign Recording File
              _self.audioFile = data.mediaUris.S.mediaUri;
              console.log(`audio retreived!: ${_self.audioFile}`);

              showSpinner('spinner', false);
              // reload player
              $("#audioPlayer").load();
              
              $scope.$apply();
            } else {
              console.log('audioFile not yet available - retry');
              setTimeout(function () {
                getConversationRecording(_conversationId, _recordingId, _attemptNo + 1);
              }, 2000);


            }
          } catch (error) {
            console.error(error);
            showSpinner('spinner', false);
          }


        })
        .catch((err) => {
          console.log('There was a failure calling getConversationRecording');
          console.error(err);
          showSpinner('spinner', false);
        });

    }


    function getRecordingConversationId(_conversationId) {
      console.log(`getRecordingConversationId for conversationId ${_conversationId}`);
      _self.audioFile = "";
      $("#audioPlayer").load();
      $scope.$applyAsync();

      let opts = {
        'maxWaitMs': 5000, // Number | The maximum number of milliseconds to wait for the recording to be ready. Must be a positive value.
        'formatId': "NONE" // String | The desired media format. Possible values: NONE, MP3, WAV, or WEBM

      };

      apiRecordings.getConversationRecordingmetadata(_conversationId)
        .then((data) => {
          console.log(`getConversationRecordings success!`);
          console.log(data);

          if (data.length > 0 && data[0].id) {
            console.log('we can proceed');
            _self.audioFileState = "Available";
            $scope.$applyAsync();

            let recordingId = data[0].id;
            console.log(`recordingId: ${recordingId}`);

            getConversationRecording(_conversationId, recordingId);

          } else {
            console.error('no file available for this conversation');

            _self.audioFile = "";
            $("#audioPlayer").load();
            _self.audioFileState = "Unvailable";
            $scope.$applyAsync();

          }

        })
        .catch((err) => {
          console.log('There was a failure calling getConversationRecordings');
          console.error(err);
        });

    }
    _self.clearModal = function () {
      console.log('Clear modal!');

      // Clear previous AudioFile // TODO: should be executed when Modal closes
      _self.audioFile = "";
      $scope.$applyAsync();
      $("#audioPlayer").load();

    }

    function showSpinner(_spinner, _bool) {
      if (_bool) {
        $('#' + _spinner).fadeIn();
      } else {
        $('#' + _spinner).fadeOut();

      }
    }

  


  });