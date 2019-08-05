angular.module("recordingApp", []).controller("recordingsController", [
  "$scope",
  function($scope) {
    var _self = this;
    $scope.pageNumber = 1; // Default page number

    let tenantId = "785ce69c-90cf-4dc7-a882-eaf312d1d15d"; // Microsoft AD Tenant Id
    let clientId = "37a72847-7e72-4c35-8234-beca1d0f267e"; // Azure application client id
    let redirectUri = "https://szlaskidaniel.github.io/pc-recording-userPanel/index.html"; // This should be the full path to the index.html. Will be used by Microsoft to redirect to your site once authenticated. This should match the redirect uri you have set in your Azure client app.
    let getConversationsApiKey = "qzuq7LlZS6YBYP9BiyixPRcBY3mTs9adbiP7yETHbd2WgacIhOi0aQ%3D%3D"; // API Key for the /getConversations Azure function
    let getMediaInformationApiKey = "CeeXdI217ghOKpHpi3mfgtnpBA9Cd5Xs7dTSt9yTAeGV2S%2Fqv6cFFA%3D%3D"; // API Key for the /getMediaInformation Azure function
    let getRecordingStreamApiKey = "zBOVDwL94KVTEe4jR16dGDMaW1p36t8oS0vhar9Qc6%2FDAClCgma8vA%3D%3D"; // API Key for the /getRecording Azure function

    //#region Initialization & Query Parameters

    init();

    async function init() {
      showSpinner("spinnerMain", false);
      var queryParameters = await getQueryParameters();
      if (queryParameters) {
        localStorage.setItem("ms_access_token", queryParameters.access_token);
        localStorage.setItem("ms_expires_in", queryParameters.expires_in);
        localStorage.setItem("ms_id_token", queryParameters.id_token);
        localStorage.setItem("ms_scope", queryParameters.scope);
        localStorage.setItem("ms_session_state", queryParameters.session_state);
        localStorage.setItem("ms_state", queryParameters.state);
        localStorage.setItem("ms_token_type", queryParameters.token_type);
        console.log("All query parameters have been stored");
        $scope.getRecordings();
      }
    }

    async function getQueryParameters() {
      var hash = window.location.hash.substr(1);

      return await hash.split("&").reduce(function(result, item) {
        var parts = item.split("=");
        result[parts[0]] = parts[1];
        return result;
      }, {});
    }

    //#endregion

    //#region Microsoft Authentication

    // Web visitor is automatically redirected at the following url to authenticate against AD
    $scope.login = function() {
      window.location.href = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=id_token token&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=fragment&scope=openid profile email user.read&claim=groups&state=12345&nonce=678910`;
    };

    //#endregion

    //#region Recordings

    // Gets all recordings based on date/time interval
    $scope.getRecordings = function() {
      console.log("getRecordings");
      showSpinner("spinnerMain", true);

      if ($("#startDateTime").val() && $("#endDateTime").val()) {
        dateTimeInterval = `${$("#startDateTime").val()}:00/${$("#endDateTime").val()}:00`;
      }

      console.log("Date/Time interval:", dateTimeInterval);

      $.ajax({
        url: `https://recordercollector.azurewebsites.net/api/getConversations?code=${getConversationsApiKey}`,
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({
          token: localStorage.getItem("ms_id_token"),
          divisions: ["Home"],
          interval: dateTimeInterval,
          page: $scope.pageNumber
        })
      })
        .done((data, textStatus, jqXHR) => {
          showSpinner("spinnerMain", false);
          console.log("textStatus:", textStatus);
          console.log("jqXHR:", jqXHR);
          //console.log("Data:", data);
          data = JSON.parse(data);
          console.log("Data conversations:", data.result.conversations);
          _self.conversations = data.result.conversations;
          $scope.$applyAsync();
        })
        .fail((jqXHR, textStatus, errorThrown) => {
          showSpinner("spinnerMain", false);
          console.error("textStatus:", textStatus);
          console.error("jqXHR:", jqXHR);
          console.error("errorThrown:", errorThrown);

          if (jqXHR.status == 401 || jqXHR.responseText.includes("invalid")) {
            // Try to login again
            $scope.login();
          }
        });
    };

    // Get selected conversation id and retrieve all recordings for that conversation
    $scope.setCurrentConversation = function(item) {
      _self.selectedConversation = item;
      console.log(`setCurrentConversation to ${item.conversationId}`);
      getMediaInformation(item.conversationId);
    };

    // Gets the recordings for the selected conversation and retrieves the streams for each recording
    function getMediaInformation(_conversationId) {
      console.log(`getMediaInformation for conversationId ${_conversationId}`);

      $.ajax({
        url: `https://recordercollector.azurewebsites.net/api/getMediaInformation?code=${getMediaInformationApiKey}`,
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({
          token: localStorage.getItem("ms_id_token"),
          conversationId: _conversationId
        })
      })
        .done(async (data, textStatus, jqXHR) => {
          showSpinner("spinner", false);
          console.log("textStatus:", textStatus);
          console.log("jqXHR:", jqXHR);
          console.log("Data:", data);
          data = JSON.parse(data);
          console.log("Conv Details:", data.conversationDetails);
          _self.recordings = data.conversationDetails;
          $scope.$applyAsync();

          $.each(_self.recordings, async (i, recording) => {
            let file = await getRecordingStream(recording.conversationId, recording.id);
            recording.file = JSON.parse(file).url + "&xyz=" + parseInt(Math.random() * 10000);
            console.log("Recording file:", recording.file);
            switch (recording.media) {
              case "audio":
                // Add control for audio file
                $("<audio/>", { controls: "controls", preload: "auto", src: recording.file, controlsList: "nodownload" }).appendTo("#" + recording.id);
                showSpinner("spinner" + recording.id, false);
                break;
              case "screen":
                // Add control for video file
                $("<video/>", { controls: "controls", preload: "auto", src: recording.file, controlsList: "nodownload", style: "width: 100%; height: auto; margin:0 auto; frameborder:0;" }).appendTo("#" + recording.id);
                showSpinner("spinner" + recording.id, false);
                break;
              default:
                alert(`Media ${recording.media} not supported`);
                break;
            }
          });
        })
        .fail((jqXHR, textStatus, errorThrown) => {
          showSpinner("spinner", false);
          console.error("textStatus:", textStatus);
          console.error("jqXHR:", jqXHR);
          console.error("errorThrown:", errorThrown);

          if (jqXHR.status == 401 || jqXHR.responseText.includes("invalid")) {
            // Try to login again
            $scope.login();
          }
        });
    }

    // Gets the stream for a recording
    async function getRecordingStream(_conversationId, _recordingId) {
      console.log(`getRecordingConversationId for conversationId ${_conversationId} & recordingId ${_recordingId}`);

      return await $.ajax({
        url: `https://recordercollector.azurewebsites.net/api/getRecordingStream?code=${getRecordingStreamApiKey}`,
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({
          token: localStorage.getItem("ms_id_token"),
          conversationId: _conversationId,
          recordingId: _recordingId
        })
      })
        .done((data, textStatus, jqXHR) => {
          showSpinner("spinnerMain", false);
          console.log("textStatus:", textStatus);
          console.log("jqXHR:", jqXHR);
          console.log("Data:", data);
          data = JSON.parse(data);
          return data.url;
        })
        .fail((jqXHR, textStatus, errorThrown) => {
          showSpinner("spinnerMain", false);
          console.error("textStatus:", textStatus);
          console.error("jqXHR:", jqXHR);
          console.error("errorThrown:", errorThrown);

          if (jqXHR.status == 401 || jqXHR.responseText.includes("invalid")) {
            // Try to login again
            $scope.login();
          }
        });
    }

    //#endregion

    //#region Pagination

    $scope.nextPage = function() {
      $scope.pageNumber++;
      $scope.getRecordings();
    };

    $scope.previousPage = function() {
      $scope.pageNumber--;
      if ($scope.pageNumber < 1) $scope.pageNumber = 1;
      $scope.getRecordings();
    };

    $scope.showPrevious = function() {
      return $scope.pageNumber > 1;
    };

    //#endregion

    //#region Spinner

    function showSpinner(_spinner, _bool) {
      if (_bool) {
        $("#" + _spinner).fadeIn();
      } else {
        $("#" + _spinner).fadeOut();
      }
    }

    //#endregion
  }
]);
