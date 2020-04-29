// Custom variables
var clickedCoord = []
var geojsonobj = {}
var HeatMapLayer,AttributeLayer,ClusterLayer,ClusterColorLayer,moveendfunction
// Define view layer
var view =  new ol.View({
    center:[8681074.58514053, 2593650.265329959],
    zoom:6
    })


// Basemap layer
var basemapLayer = new ol.layer.Tile({
    source: new ol.source.Stamen({
        layer:'terrain'
    })
  })
// Layers Array
var layerArray = [basemapLayer]
// Initiating Map
var map = new ol.Map({
    target : 'mymap',
    view :view,
    layers:layerArray
})


//  1. To define a source
var drawSource = new ol.source.Vector()
// 2. To Define a style
// Skip it and let the OL use default styling
// 3. To Define a Layer
var drawLayer = new ol.layer.Vector({
    source:drawSource
})
// 4. Adding on map
map.addLayer(drawLayer)


// Initiate a draw interaction
var draw = new ol.interaction.Draw({
    type : 'Point',
    source:drawSource
})
draw.on('drawstart', function(evt){
    drawSource.clear()
})
draw.on('drawend',function(evt){
    // alert('point is added')
    clickedCoord = evt.feature.getGeometry().getFlatCoordinates() 
    $('#pointadding').modal('show');
    console.log('clicked at', evt.feature.getGeometry().getFlatCoordinates()    )
    map.removeInteraction(draw)
})

// Function that enables draw interaction

function startDrawing(){
// add interaction to the map
map.addInteraction(draw)
}


// Save data from form to database
function SaveDatatodb(){
    var name = document.getElementById('userName').value;
    var cond = document.getElementById('usercondition').value;
    var long = clickedCoord[0];
    var lat = clickedCoord[1];
    if (name != '' && cond != '' && long != '' && lat != ''){
        $.ajax({
            url:'save.php',
            type:'POST',
            data :{
                username : name,
                usercond : cond,
                userlong : long,
                userlat : lat
            },
            success : function(dataResult){
                var dataResult = JSON.parse(dataResult)
                if (dataResult.statusCode == 200){
                    
                    $('#pointadding').modal('hide');
                } else {
                    
                }
            }
        })
    } else {
        alert('Please fill complete information')
    }


}


// Creating gepjson from database response
function creatingGeojson(arrayofdata){
geojsonobj['type'] = "FeatureCollection"
var features = []
 for(i=0;i<arrayofdata.length;i++){
    var featobj = {}
    featobj['type'] = 'Feature'
    featobj['properties'] = {'condition' : arrayofdata[i].condition,
                             'name': arrayofdata[i].name}
    featobj['geometry'] = JSON.parse(arrayofdata[i].st_asgeojson)
    features.push(featobj)
 }
 geojsonobj['features'] = features

//  Define source to show this data
var dataSource = new ol.source.Vector({
    features : (new ol.format.GeoJSON().readFeatures(geojsonobj))
})

// HEATMAP
 HeatMapLayer = new ol.layer.Heatmap({
    source:dataSource
})

map.addLayer(HeatMapLayer)
HeatMapLayer.setVisible(false)

// ATTRIBUTE BASED STYLING
 AttributeLayer = new ol.layer.Vector({
    source:dataSource,
    style: function(feature){
        if (feature.values_.condition == 'Throat' || feature.values_.condition == 'Nose'  || feature.values_.condition == 'Skin'){
            return new ol.style.Style({
                    image :new ol.style.Circle({
                        fill: new ol.style.Fill({
                            color:'#0000ff'
                        }),
                        radius:7
                    })
                })
        } else if (feature.values_.condition == 'Healthy'  ){
            return new ol.style.Style({
                image :new ol.style.Circle({
                    fill: new ol.style.Fill({
                        color:'#00FF00'
                    }),
                    radius:7
                })
            })
        } else {
            return new ol.style.Style({
                image :new ol.style.Circle({
                    fill: new ol.style.Fill({
                        color:'#ff0000'
                    }),
                    radius:7
                })
            }) 
        }
    }
})

map.addLayer(AttributeLayer)
AttributeLayer.setVisible(false)


// ADD CLUSTER
clusterSource = new ol.source.Cluster({
    distance: parseInt(40, 10),
    source: dataSource
  });

  
  var styleCache = {};
 ClusterLayer = new ol.layer.Vector({
    source: clusterSource,
    style: function(feature) {
      var size = feature.get('features').length;
      var style = styleCache[size];
      if (!style) {
        style = new ol.style.Style({
          image: new ol.style.Circle({
            radius: 10,
            stroke: new ol.style.Stroke({
              color: '#fff'
            }),
            fill: new ol.style.Fill({
              color: '#3399CC'
            })
          }),
          text: new ol.style.Text({
            text: size.toString(),
            fill: new ol.style.Fill({
              color: '#fff'
            })
          })
        });
        styleCache[size] = style;
      }
      return style;
    }
  });

  map.addLayer(ClusterLayer)
  ClusterLayer.setVisible(false)
// map.addLayer(dataLayer)


  // Vector source
  var source =new ol.source.Vector({
        features : (new ol.format.GeoJSON().readFeatures(geojsonobj))
    })
  // Interaction to move the source features
  var modify = new ol.interaction.Modify({ source: source });
  modify.setActive(false);
  map.addInteraction(modify);
  var layerSource = new ol.layer.Vector({ source: source, visible:false })
  map.addLayer(layerSource);

  var hexbin, layer, binSize;
  var style = 'color';
  var min, max, maxi;
  var minRadius = 1;
  var styleFn = function(f,res){
    switch (style){
      // Display a point with a radius 
      // depending on the number of objects in the aggregate.
      case 'point':{
        var radius = Math.round(binSize/res +0.5) * Math.min(1,f.get('features').length/max);
        if (radius < minRadius) radius = minRadius;
        return	[ new ol.style.Style({
          image: new ol.style.RegularShape({
            points: 6,
              radius: radius,
              fill: new ol.style.Fill({ color: [0,0,255] }),
              rotateWithView: true
            }),
            geometry: new ol.geom.Point(f.get('center'))
          })
          //, new ol.style.Style({ fill: new ol.style.Fill({color: [0,0,255,.1] }) })
        ];
      }
      // Display the polygon with a gradient value (opacity) 
      // depending on the number of objects in the aggregate.
      case 'gradient': {
        var opacity = Math.min(1,f.get('features').length/max);
        return [ new ol.style.Style({ fill: new ol.style.Fill({ color: [0,0,255,opacity] }) }) ];
      }
      // Display the polygon with a color
      // depending on the number of objects in the aggregate.
      case 'color':
      default: {
        var color;
        if (f.get('features').length > max) color = [136, 0, 0, 1];
        else if (f.get('features').length > min) color = [255, 165, 0, 1];
        else color = [0, 136, 0, 1];
        return [ new ol.style.Style({ fill: new ol.style.Fill({  color: color }) }) ];
      }
    }
  };
  
  // Create HexBin and calculate min/max
  function reset(givensize) {
    var size = givensize;
    if (ClusterColorLayer) map.removeLayer(ClusterColorLayer);
    binSize = size;
    var features;
    hexbin = new ol.source.HexBin({
      source: source,		// source of the bin
      size: size			// hexagon size (in map unit)
    });
    ClusterColorLayer = new ol.layer.Vector({ 
      source: hexbin, 
      opacity:0.5, 
      style: styleFn, 
      renderMode: 'image'
    });
    features = hexbin.getFeatures();
    // Calculate min/ max value
    min = Infinity;
    max = 0;
    for (var i=0, f; f=features[i]; i++)
    {	var n = f.get('features').length;
      if (n<min) min = n;
      if (n>max) max = n;
    }
    var dl = (max-min);
    maxi = max;
    min = Math.max(1,Math.round(dl/4));
    max = Math.round(max - dl/3);
    // $(".min").text(min);
    // $(".max").text(max);

    // Add layer
    map.addLayer(ClusterColorLayer);
  }
  ;

  moveendfunction = function(evt){
    var currentZoomlevel = map.getView().getZoom()
    if (currentZoomlevel >12){
        reset (5000)
    } else  if (currentZoomlevel >11){
        reset (10000)
    } else  if (currentZoomlevel >9){
        reset (15000)
    } else  if (currentZoomlevel >8){
        reset (25000)
    } else  if (currentZoomlevel >8){
        reset (35000)
    } else  if (currentZoomlevel >6){
        reset (45000)
    } else  if (currentZoomlevel >5){
        reset (55000)
    } 
}
map.on('moveend',moveendfunction )

}




// Adding Layer based on selection
function addLayer(type) {
    if (type == 'Heatmap'){
        HeatMapLayer.setVisible(true)
        AttributeLayer.setVisible(false)
        ClusterLayer.setVisible(false)
        ClusterColorLayer.setVisible(false)
        map.un('moveend',moveendfunction )
    }else if (type == 'Attribute'){
        HeatMapLayer.setVisible(false)
        AttributeLayer.setVisible(true)
        ClusterLayer.setVisible(false)
        ClusterColorLayer.setVisible(false)
        map.un('moveend',moveendfunction )
    }else if (type == 'ClusterColor'){
        HeatMapLayer.setVisible(false)
        AttributeLayer.setVisible(false)
        ClusterLayer.setVisible(false)
        ClusterColorLayer.setVisible(true)
        map.on('moveend',moveendfunction )
    }else if (type == 'Cluster'){
        HeatMapLayer.setVisible(false)
        AttributeLayer.setVisible(false)
        ClusterLayer.setVisible(true)
        ClusterColorLayer.setVisible(false)
        map.un('moveend',moveendfunction )
    }
}