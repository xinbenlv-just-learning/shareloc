/**
 * Created by zzn on 2014-06-21.
 */
(function () {
    'use strict';
    // zzn: everything light!!!

    var LOG = function (msg) {
        console.log(msg);
    };

    var CONSTS = {
        deviceId: "deviceId",
        Location: "Location",
        position: "position",
        channel: "channel",
        iconUrl: "iconUrl"
    }

    var REFRESH_INTERVAL = 10000; // in ms

    var initializeParse = function () {
        // TODO(zzn): credentials in code base. But I don't care :p
        Parse.initialize("kA3HKKMC4ysZG0SIeoDPrHyquvbaqMfm4WG7fa29", "TcqHTDzXTN0JF9iVEbEYbnSX9Um9VUs8ICN8cHfA");
    };

    var handleNoGeolocation = function (error) {
        LOG("failed" + JSON.stringify(error));
    };

    var uploadMyLocation = function (myDeviceId, position, channel, myIconUrl) {
        var Location = Parse.Object.extend(CONSTS.Location);
        var query = new Parse.Query(Location);
        query.equalTo(CONSTS.deviceId, myDeviceId);
        query.equalTo(CONSTS.channel, channel);
        query.limit(1);
        query
            .find()
            .then(function(locations) {
            var location;
            if (locations.length == 1) {
                location = locations[0];
            } else {
                location = new Location();
            }
            location.set(CONSTS.deviceId, myDeviceId);
            location.set(CONSTS.position, position);
            location.set(CONSTS.channel, channel);
            if(myIconUrl) {
                location.set(CONSTS.iconUrl, myIconUrl);
            }
            location.save().then(
                function(savedLocation) {
                    // Execute any logic that should take place after the object is saved.
                    LOG('New object created / updated with objectId: ' + savedLocation.id);
                }, function(error) {
                    // Execute any logic that should take place if the save fails.
                    // error is a Parse.Error with an error code and description.
                    LOG('Failed to create new object, with error code: ' + JSON.stringify(error));
                }
            );
        });

    };

    var refreshMarkers = function(map, myDeviceId, channel) {
        var Location = Parse.Object.extend("Location");
        var query = new Parse.Query(Location);
        query.notEqualTo(CONSTS.deviceId, myDeviceId);
        query.equalTo(CONSTS.channel, channel);
        query.limit(10);
        query.find({
            success: function(locations) {
                LOG("received " + locations.length + " locations");
                for (var i = 0; i < locations.length; i++) {
                    var location = locations[i];
                    var position = location.get("position");
                    var deviceId = location.get("deviceId");
                    var iconUrl = location.get(CONSTS.iconUrl);
                    LOG("position received " + i + " " + JSON.stringify(position));
                    var marker = new google.maps.Marker({
                        title: deviceId,
                        icon: {
                            path: iconUrl ? iconUrl : google.maps.SymbolPath.CIRCLE,
                            scale: 10
                        }
                    });
                    marker.setPosition(new google.maps.LatLng(
                        position.coords.latitude,
                        position.coords.longitude
                    ));
                    marker.setMap(map);
                }
            },
            error: function() {
                LOG("error!");
            }
        });
    };

    var createNewUuid = function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    };

    var getDeviceId = function () {
        var deviceId = $.cookie("deviceId");
        if (!deviceId) {
            deviceId = createNewUuid();
            $.cookie("deviceId", deviceId);
        }
        return deviceId;
    };

    var showChannelBanner = function(channel) {
        if (!channel) {
            $("#channel-label").hide();
        } else {
            $("#channel-label span").html("<span>" + channel + "</span>");
        }
    };

    var getChannel = function() {
        var currentUrl = window.location.hash;
        var channel = currentUrl.split("!")[1];
        if (!channel) {
            channel = "global";
        }
        return channel;
    };

    var initFacebook = function(){
        window.fbAsyncInit = function() {
            Parse.FacebookUtils.init({
                appId      : '1517187011834297',
                status     : true,
                xfbml      : true
            });
        };

        (function(d, s, id){
            var js, fjs = d.getElementsByTagName(s)[0];
            if (d.getElementById(id)) {return;}
            js = d.createElement(s); js.id = id;
            js.src = "//connect.facebook.net/en_US/all.js";
            fjs.parentNode.insertBefore(js, fjs);
        }(document, 'script', 'facebook-jssdk'));

    };

    var main = function () {
        initializeParse();
        initFacebook();
        // get channel

        var myMarker; // larger scope
        var myIconUrl;
        google.maps.event.addDomListener(window, 'load', function () {
            var mapOptions = {
                center: new google.maps.LatLng(37.3881838, -122.0027331), // TODO(zzn): change it later
                zoom: 8
            };
            var map = new google.maps.Map(document.getElementById("map-canvas"),
                mapOptions);
            myMarker = new google.maps.Marker({
                map: map,
                title: "My Location"
            });

            var deviceId = getDeviceId();
            var channel = getChannel();
            showChannelBanner(channel);
            var execInsetInterval = function () {
                LOG("updating!");

                // Set my hacker
                navigator.geolocation.getCurrentPosition(function (position) {
                    myMarker.setPosition(
                        new google.maps.LatLng(
                            position.coords.latitude,
                            position.coords.longitude)
                    );
                    uploadMyLocation(deviceId, position, channel, myIconUrl);
                    refreshMarkers(map, deviceId, channel);
                }, handleNoGeolocation);
            };
            execInsetInterval();
            setInterval(execInsetInterval, REFRESH_INTERVAL);
        });

        $("#sign-in").click(function () {
            Parse.FacebookUtils.logIn("email", {
                success: function (user) {
                    if (!user.existed()) {
                        LOG("User signed up and logged in through Facebook!");
                    } else {
                        LOG("User logged in through Facebook!");
                        FB.api('/me', {fields: 'name,picture'}, function(response) {
                            console.log(response);
                            if (myMarker) {
                                myIconUrl = response.picture.data.url;
                                myMarker.setIcon(response.picture.data.url);

                            }
                        });
                    }
                },
                error: function (user, error) {
                    alert("User cancelled the Facebook login or did not fully authorize.");
                }
            });
        });
    }

    $(document).ready(function() {
        main(); // Run
    });

})();
