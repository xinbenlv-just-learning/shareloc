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
        position: "position"
    }

    var REFRESH_INTERVAL = 10000; // in ms

    var initializeParse = function () {
        // TODO(zzn): credentials in code base. But I don't care :p
        Parse.initialize("kA3HKKMC4ysZG0SIeoDPrHyquvbaqMfm4WG7fa29", "TcqHTDzXTN0JF9iVEbEYbnSX9Um9VUs8ICN8cHfA");
    };

    var handleNoGeolocation = function (error) {
        LOG("failed" + error);
    };

    var uploadMyLocation = function (myDeviceId, position) {
        var Location = Parse.Object.extend(CONSTS.Location);
        var query = new Parse.Query(Location);
        query.equalTo(CONSTS.deviceId, myDeviceId);
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

    var refreshMarkers = function(map, myDeviceId) {
        var Location = Parse.Object.extend("Location");
        var query = new Parse.Query(Location);
        query.notEqualTo(CONSTS.deviceId, myDeviceId);
        query.limit(10);
        query.find({
            success: function(locations) {
                LOG("received " + locations.length + " locations");
                for (var i = 0; i < locations.length; i++) {
                    var location = locations[i];
                    var position = location.get("position");
                    var deviceId = location.get("deviceId");
                    LOG("position received " + i + " " + JSON.stringify(position));
                    var marker = new google.maps.Marker({
                        title: deviceId,
                        icon: {
                            path: google.maps.SymbolPath.CIRCLE,
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



    var main = function () {
        initializeParse();

        google.maps.event.addDomListener(window, 'load', function () {
            var mapOptions = {
                center: new google.maps.LatLng(37.3881838, -122.0027331), // TODO(zzn): change it later
                zoom: 8
            };
            var map = new google.maps.Map(document.getElementById("map-canvas"),
                mapOptions);
            var myMarker = new google.maps.Marker({
                map: map,
                title: "My Location"
            });

            var deviceId = getDeviceId();
            var execInsetInterval = function () {
                LOG("updating!");

                // Set my hacker
                navigator.geolocation.getCurrentPosition(function (position) {
                    myMarker.setPosition(
                        new google.maps.LatLng(
                            position.coords.latitude,
                            position.coords.longitude)
                    );
                    uploadMyLocation(deviceId, position);
                    refreshMarkers(map, deviceId);
                }, handleNoGeolocation);
            };
            execInsetInterval();
            setInterval(execInsetInterval, REFRESH_INTERVAL);
        });

    };

    main(); // Run

})();
