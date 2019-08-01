angular.module("recordingApp", []).controller("purecloudController", [
  "$scope",
  function($scope) {
    var _self = this;
    $scope.pageNumber = 1;

    let tenantId = "785ce69c-90cf-4dc7-a882-eaf312d1d15d";
    let redirectUri = "http://localhost:5500/index.html"; // 'https://szlaskidaniel.github.io/pc-recording-userPanel/index.html'
    let clientId = "37a72847-7e72-4c35-8234-beca1d0f267e";
    let getConversationsApiKey = "qzuq7LlZS6YBYP9BiyixPRcBY3mTs9adbiP7yETHbd2WgacIhOi0aQ%3D%3D";

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

    $scope.login = function() {
      window.location.href = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=id_token token&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=fragment&scope=openid profile email user.read&claim=groups&state=12345&nonce=678910`;
    };

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

    $scope.getRecordings = function() {
      console.log("getRecordings");
      showSpinner("spinnerMain", true);

      var dateTimeInterval = getDateTimeInterval();
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

    function getDateTimeInterval() {
      if ($("#startDateTime").val() && $("#endDateTime").val()) {
        return `${$("#startDateTime").val()}:00/${$("#endDateTime").val()}:00`;
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

    function showSpinner(_spinner, _bool) {
      if (_bool) {
        $("#" + _spinner).fadeIn();
      } else {
        $("#" + _spinner).fadeOut();
      }
    }
  }
]);
