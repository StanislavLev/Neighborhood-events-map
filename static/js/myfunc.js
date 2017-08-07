var map;
var markers = [];
var eventsNum = 10;
var startMarker;
var startCoordinates = {lat: 47.600317, lng: -122.332344};

//initializing google map
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: startCoordinates,
        zoom: 13
    });

    startMarker = new google.maps.Marker({
        map: map,
        position: startCoordinates,
        title: "Start search location.",
        animation: google.maps.Animation.DROP,
        icon: "http://chart.googleapis.com/chart?chst=d_map_pin_icon_withshadow&chld=camping|ADDE63",
        id: 0,
        draggable: true,
        info: new google.maps.InfoWindow()
    });
    
    startMarker.info.setContent('<h3>1. Drag me to any place</h3><h3>2. Click "Get new random events!" button</h3><h3>3. Find events near me! :)</h3>');
    
    addMarkerListener(startMarker);


        
    //startMarker with id=0 that`s why for loop starts from 1
    for (var i = 1; i <= eventsNum; i++){
        var marker = new google.maps.Marker({
            map: map,
            position: {lat: 0, lng: 0},
            title: "",
            animation: google.maps.Animation.DROP,
            icon: "http://chart.googleapis.com/chart?chst=d_map_pin_letter_withshadow&chld=" + i + "|0000FF|000000",
            id: i,
            info: new google.maps.InfoWindow(),
            category: []
        });
        
        addMarkerListener(marker);
        markers.push(marker);
    }

    //create click, mouseover and mouseout listeners for marker 
    function addMarkerListener (marker){
        var highlitedMarker;
        var defaultMarker;
        if (marker === startMarker){
            highlitedMarker = "http://chart.googleapis.com/chart?chst=d_map_pin_icon_withshadow&chld=camping|FFFF00";
            defaultMarker = "http://chart.googleapis.com/chart?chst=d_map_pin_icon_withshadow&chld=camping|ADDE63";
        }
        else {
            highlitedMarker = "http://chart.googleapis.com/chart?chst=d_map_pin_letter_withshadow&chld=" + marker.id + "|FFFF00|000000";
            defaultMarker = "http://chart.googleapis.com/chart?chst=d_map_pin_letter_withshadow&chld=" + marker.id + "|0000FF|000000";
        }
        // Create an onclick event to open the large infowindow at each marker.
        marker.addListener('click', function() {
            if(marker.info.opened){
                marker.info.close();
                marker.info.opened=false;
                marker.setAnimation(null);
            }
            else {
                marker.info.open(map, marker);
                marker.info.opened=true;
                marker.setAnimation(google.maps.Animation.BOUNCE);                 
            }
        });
        marker.info.addListener('closeclick', function(){
            marker.info.opened=false;
            marker.setAnimation(null);
        });
        // Two event listeners - one for mouseover, one for mouseout,
        // to change the colors back and forth.
        marker.addListener('mouseover', function() {
            marker.setIcon(highlitedMarker);
        });
        marker.addListener('mouseout', function() {
            marker.setIcon(defaultMarker);
        });
    }
}
///////////End of initMap() /////////////////

///////////place marker on the map
function updateMarker(marker, event, bounds){
    var eventPosition = {lat: parseFloat(event.latitude), lng: parseFloat(event.longitude)};
    marker.title = event.title;
    marker.setPosition(eventPosition);
    marker.setMap(map);
    var content = '<h3>'+event.title+'</h3>';
    //add category to infowindow
    content = content + '<p>Category:</p><p>';
    for(var c = 0; c < event.categories.category.length; c++){
        marker.category.push(event.categories.category[c].name.replace("&amp;", "and"));
        content = content +  event.categories.category[c].name.replace("&amp;", "and") +"; ";
    }
    content = content + '</p>';
    //sometimes there is no description in event or it is space or one symbol
    if (event.description && event.description.length > 3){
        content = content + '<p>Description:</p><p>' + event.description + '</p>';
    }
    else{
        content = content + '<p>Description:</p><a target="_blank" href="' + event.url + '">find more info here</a>';
    }
    //sometimes there is no address in event or address = ","
    if(event.venue_address && event.venue_address.length > 3){
        content = content + '<p>Address:</p><p>' + event.venue_address + '</p>';
    }else{
        content = content + '<p>Address:</p><a target="_blank" href="' + event.url + '">find more info here</a>'; 
    }
    marker.info.setContent(content);
    
    bounds.extend(eventPosition);
}

//ADD items to category filter list from VISIBLE markers from marker list 
//iterate over all markers and array of categories in each marker
//NOTE: categoryList - is not array, but observable array i.e. function
//showMarkers field used in checkbox
function createCategoryList(categoryList){
    for (var mrk = 0; mrk < markers.length; mrk++){
        if(markers[mrk].map){
            for (var ctg = 0; ctg<markers[mrk].category.length; ctg++){
                var currCategory = markers[mrk].category[ctg];
                if(categoryList().length > 0){
                    var categoryExists = false;
                    //iterate over categoryList array and check if current category exists
                    for (var flt = 0; flt < categoryList().length; flt++){
                        if(categoryList()[flt].category === currCategory ){
                            categoryExists = true;
                            break;
                        }
                    }
                    if(!categoryExists){
                        categoryList.push({category: currCategory, showMarkers: true});
                    }
                }
                // push the first currCategory
                else {
                    categoryList.push({category: currCategory, showMarkers: true});
                }
            }
        }
    }
}

///////function that called "onerror" when google map script fails
function errorMap(){
    $('#map').append('<h2 class="DarkRed-text text-center"> Something went wrong,</h2>'+
                     '<h2 class="DarkRed-text text-center">google map not available now,</h2>'+
                     '<h2 class="DarkRed-text text-center">please try again later!</h2>');
}

function getEventsAjax(ajaxUrl, eventList, categoryList, getEventsError){
    $.ajax({
        url: ajaxUrl,
        dataType: "jsonp",
    }).done(function(response){
        //if response is valid
        if(response.events){
            //create all markers and bounds for map
            var currentMarker = 0;
            var bounds = new google.maps.LatLngBounds();
            for (var k = 0; k < response.events.event.length; k++){
                var randEventNum = parseInt(Math.random()*response.events.event.length);
                //check if random event is new one,
                //if it was got before, find the next new one,
                //after last item in array start from the beginning
                while (response.events.event[randEventNum]===false){
                    if (randEventNum < response.events.event.length-1){
                        randEventNum = randEventNum + 1;
                    } 
                    else {
                        randEventNum = 0;
                    }
                }
                                    
                //add event on page(marker, search result)
                if(currentMarker === 0){
                    updateMarker(markers[currentMarker], response.events.event[randEventNum], bounds);
                    eventList.push({title: response.events.event[randEventNum].title, id: currentMarker});
                    currentMarker = currentMarker + 1;
                    continue;
                }
                // Starting from the second event - check if there are event in the same location,
                // if yes, ignore it (looking for 10 different places), otherwise add new event on page;
                // saved value can be different from restored. For example saved = -122.093, restored = -122.09300000000002
                // that's why difference checked and not equality
                var markerExists = false;

                for(var l = 0; l < currentMarker; l++){
                    if(Math.abs(markers[l].getPosition().lat() - parseFloat(response.events.event[randEventNum].latitude)) > 0.0000001 ||
                       Math.abs(markers[l].getPosition().lng() - parseFloat(response.events.event[randEventNum].longitude)) > 0.0000001){
                        continue;
                    }  
                    markerExists = true;
                    break;
                }
                if(!markerExists){
                    updateMarker(markers[currentMarker], response.events.event[randEventNum], bounds);
                    eventList.push({title: response.events.event[randEventNum].title, id: currentMarker});
                    currentMarker = currentMarker + 1;
                }
                if(currentMarker===eventsNum){
                    break;
                }
                response.events.event[randEventNum]=false;
            }
            createCategoryList(categoryList);
            //zoom map depend on markers location
            map.fitBounds(bounds);
        }
        else {
            getEventsError("Nothing was found, try to change location.");
            console.log("dadada" + getEventsError + getEventsError());
        }
    }).fail(function() {
            getEventsError("Request failed, please try again.");
                        console.log("oioioi" + getEventsError + getEventsError());

    });
}       
        
        
        
///////knockoutjs model
var AppViewModel = function() {
    // new name for "this" for access from jquery objects 
    var self = this;
    self.showAll = ko.observable(true);
    self.eventList = ko.observableArray();
    self.categoryList = ko.observableArray();
    self.getEventsError = ko.observable("");
    
    //for checkbox near "Filtr by category"
    self.hideShowAllFunc = function(showCheckBox){
        if(showCheckBox()){
            for(var h = 0; h < self.categoryList().length; h++){
                self.categoryList.replace(self.categoryList()[h], {category: self.categoryList()[h].category, showMarkers: true});
            }
        }
        else{
            for(var g = 0; g < self.categoryList().length; g++){
                self.categoryList.replace(self.categoryList()[g], {category: self.categoryList()[g].category, showMarkers: false});
            }
        }
        self.updateVisibleMarkers();
    };
    
    ///////open and close infowindow of markers, wher click on result list item
    self.showInfoWindow = function(id){
        if(markers[id].info.opened){
            markers[id].info.close();
            markers[id].info.opened=false;
            markers[id].setAnimation(null); 
        }
        else{
            markers[id].info.open(map, markers[id]);
            markers[id].info.opened=true;
            markers[id].setAnimation(google.maps.Animation.BOUNCE); 
        }
    };
    ///////End of "open and close infowindow of markers, wher click on result list item"
    
    ///////change color of markers, when hover on result list item
    self.yellowMarker = function(id){
        markers[id].setIcon("http://chart.googleapis.com/chart?chst=d_map_pin_letter_withshadow&chld=" + markers[id].id + "|FFFF00|000000");
    };
    self.blueMarker = function(id){
        markers[id].setIcon("http://chart.googleapis.com/chart?chst=d_map_pin_letter_withshadow&chld=" + markers[id].id + "|0000FF|000000");
    };
    ///////End of "change color of markers, when hover on result list item"
    
    self.updateVisibleMarkers = function(){
        var tempCategory;
        var showMarker;
        for(var x = 0; x < markers.length; x++){
            showMarker = false;
            for(var y = 0; y < markers[x].category.length; y++){
                tempCategory = markers[x].category[y];
                for(var z = 0; z < self.categoryList().length; z++){
                    if(tempCategory ===  self.categoryList()[z].category && self.categoryList()[z].showMarkers){
                        showMarker = true;
                        break;
                    }
                }
                if(showMarker){
                    markers[x].setMap(map);
                    self.eventList.replace(self.eventList()[x], {title: markers[x].title, id: markers[x].id-1});
                }
                else {
                    markers[x].setMap(null);
                    self.eventList.replace(self.eventList()[x], {title: "", id: markers[x].id-1});
                }
            }
        }
    };
    //This function bounded to "Get random events!" button.click
    //data-bind = "click: loadData()" triggers loadData on load page, when "click: loadData" (without parenthesis) doesn't
    //this feature used to load random events the first time
    self.loadData = function() {
        ///////remove markers from map, and items from events and category filter lists before new search
        for (var j = 0; j < markers.length; j++) {
            markers[j].setMap(null);
            markers[j].setPosition({lat: 0, lng: 0});
            markers[j].title = "";
            markers[j].category = [];
            markers[j].info.setContent('');
        }
        self.eventList.removeAll();
        self.categoryList.removeAll();
        self.showAll(true);
        self.getEventsError("");
        ///////End of "remove markers from map, and items from events and category filter lists before new search"
        
        /////// AJAX request 
        var ajaxUrl = "http://api.eventful.com/json/events/search?app_key=F2sJN3FLFLsf5ssJ";
        ajaxUrl = ajaxUrl + "&location=" + startMarker.getPosition().lat() + "," + startMarker.getPosition().lng();
        ajaxUrl = ajaxUrl + "&date=Today";
        ajaxUrl = ajaxUrl + "&within=5";
        ajaxUrl = ajaxUrl + "&units=mi";
        ajaxUrl = ajaxUrl + "&page_size=50";
        ajaxUrl = ajaxUrl + "&include=categories";
        //Note: self.eventList and self.categoryList actually functions and not arrays
        getEventsAjax(ajaxUrl, self.eventList, self.categoryList, self.getEventsError);
        ///////End of "AJAX request"
        return false;
    };
};
///////End of "knockoutjs model"

//Because AppViewModel uses AJAX request that depend on map,
//binding applying when document ready (may be there is better way :) )
$(document).ready(function(){
    ko.applyBindings(new AppViewModel());
});
