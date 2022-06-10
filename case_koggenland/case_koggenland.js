// Cesium ion token
Cesium.Ion.defaultAccessToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3NTc2Y2VkMy1lNDJhLTRlM2ItYTU2Ni02OGZkY2FjNGNkMjUiLCJpZCI6NjMwNjIsImlhdCI6MTYzNzUxODMxNX0.5nRha1BkXX6A4mOYFwC8kKSruiIXU2Xkla6h5UjabAw";

// Cesium viewer and globe parameters
const viewer = new Cesium.Viewer("cesiumContainer", {
  terrainProvider: Cesium.createWorldTerrain(),
});

const scene = viewer.scene;
const globe = scene.globe;

scene.screenSpaceCameraController.enableCollisionDetection = false;
globe.translucency.frontFaceAlphaByDistance = new Cesium.NearFarScalar(
  400.0,
  0.0,
  800.0,
  1.0
);


// Add Bing Maps Road for reference
 const roadmap = viewer.imageryLayers.addImageryProvider(
        new Cesium.IonImageryProvider({assetId: 4})
      );

// Add the Cesium OSM Buildings for reference
 const buildings = scene.primitives.add(
        new Cesium.Cesium3DTileset({
          url: Cesium.IonResource.fromAssetId(96188),
        })
      );

// Add the rainwater drainage pipe segment from  
// the municipality of Koggenland
      const telecomTileset = scene.primitives.add(
        new Cesium.Cesium3DTileset({
          url: Cesium.IonResource.fromAssetId(1116301),
        })
      );

// Add the parcels from the municipality of Koggenland
      const parcelTileset = scene.primitives.add(
        new Cesium.Cesium3DTileset({
          url: Cesium.IonResource.fromAssetId(1116302),
        })
      );


// viewModel parameters
const viewModel = {
  roadmap: false,
  buildings: false,
  translucencyEnabled: true,
  fadeByDistance: true,
  alpha: 0.5,
  parcelTileset: true,
  telecomTileset: true,   
};

Cesium.knockout.track(viewModel);
const toolbar = document.getElementById("toolbar");
Cesium.knockout.applyBindings(viewModel, toolbar);
for (const name in viewModel) {
  if (viewModel.hasOwnProperty(name)) {
    Cesium.knockout.getObservable(viewModel, name).subscribe(update);
  }
}

function update() {
  globe.translucency.enabled = viewModel.translucencyEnabled;

  let alpha = Number(viewModel.alpha);
  alpha = !isNaN(alpha) ? alpha : 1.0;
  alpha = Cesium.Math.clamp(alpha, 0.0, 1.0);

  globe.translucency.frontFaceAlphaByDistance.nearValue = alpha;
  globe.translucency.frontFaceAlphaByDistance.farValue = viewModel.fadeByDistance? 1.0
    : alpha;
  
  telecomTileset.show = viewModel.telecomTileset;
  parcelTileset.show = viewModel.parcelTileset;
  roadmap.show = viewModel.roadmap;
  buildings.show = viewModel.buildings;
}

update();

// Toolbar buttons in order to fly to the overview and the objects
Sandcastle.addDefaultToolbarButton("Overview", function () {  
  viewer.camera.flyTo({
  destination: Cesium.Cartesian3.fromDegrees(4.925872, 52.656812, 500.0)
});
});

Sandcastle.addDefaultToolbarButton("Drainage pipe segment", function () {
  viewer.flyTo(telecomTileset);
});

Sandcastle.addDefaultToolbarButton("Parcels", function () {
  viewer.flyTo(parcelTileset);
});


// Styling for the on mouse over and on mouse click events

      // Overlay for showing feature name on mouse over
      var nameOverlay = document.createElement("div");
      viewer.container.appendChild(nameOverlay);
      nameOverlay.className = "backdrop";
      nameOverlay.style.display = "none";
      nameOverlay.style.position = "absolute";
      nameOverlay.style.bottom = "0";
      nameOverlay.style.left = "0";
      nameOverlay.style["pointer-events"] = "none";
      nameOverlay.style.padding = "4px";
      nameOverlay.style.backgroundColor = "black";

      // Information about the currently selected feature
      var selected = {
        feature: undefined,
        originalColor: new Cesium.Color(),
      };

      // An entity object which will hold info about the currently selected feature for infobox display
      var selectedEntity = new Cesium.Entity();

      // Get default left click handler for when a feature is not picked on left click
      var clickHandler = viewer.screenSpaceEventHandler.getInputAction(
        Cesium.ScreenSpaceEventType.LEFT_CLICK
      );

      // If silhouettes are supported, silhouette features in blue on mouse over and silhouette green on mouse click.
      // If silhouettes are not supported, change the feature color to yellow on mouse over and green on mouse click.
      if (Cesium.PostProcessStageLibrary.isSilhouetteSupported(scene)) {
        // Silhouettes are not supported. Instead, change the feature color.

        // Information about the currently highlighted feature
        var highlighted = {
          feature: undefined,
          originalColor: new Cesium.Color(),
        };

        // Color a feature yellow on hover.
        viewer.screenSpaceEventHandler.setInputAction(function onMouseMove(
          movement
        ) {
          // If a feature was previously highlighted, undo the highlight
          if (Cesium.defined(highlighted.feature)) {
            highlighted.feature.color = highlighted.originalColor;
            highlighted.feature = undefined;
          }
          // Pick a new feature
          var pickedFeature = scene.pick(movement.endPosition);
          if (!Cesium.defined(pickedFeature)) {
            nameOverlay.style.display = "none";
            return;
          }
          // A feature was picked, so show it's overlay content
          nameOverlay.style.display = "block";
          nameOverlay.style.bottom =
            viewer.canvas.clientHeight - movement.endPosition.y + "px";
          nameOverlay.style.left = movement.endPosition.x + "px";
          var name = pickedFeature.getProperty("name");
          if (!Cesium.defined(name)) {
            name = pickedFeature.getProperty("id");
          }
          nameOverlay.textContent = name;
          
          // Highlight the feature if it's not already selected.
          if (pickedFeature !== selected.feature) {
            highlighted.feature = pickedFeature;
            Cesium.Color.clone(pickedFeature.color, highlighted.originalColor);
            pickedFeature.color = Cesium.Color.LIME;
          }
        },
        Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        // Color a feature on selection and show metadata in the InfoBox.
        viewer.screenSpaceEventHandler.setInputAction(function onLeftClick(
          movement
        ) {
          // If a feature was previously selected, undo the highlight
          if (Cesium.defined(selected.feature)) {
            selected.feature.color = selected.originalColor;
            selected.feature = undefined;
          }
          
          // Pick a new feature
          var pickedFeature = scene.pick(movement.position);
          if (!Cesium.defined(pickedFeature)) {
            clickHandler(movement);
            return;
          }
          
          // Select the feature if it's not already selected
          if (selected.feature === pickedFeature) {
            return;
          }
          selected.feature = pickedFeature;
          
          // Save the selected feature's original color
          if (pickedFeature === highlighted.feature) {
            Cesium.Color.clone(
              highlighted.originalColor,
              selected.originalColor
            );
            highlighted.feature = undefined;
          } else {
            Cesium.Color.clone(pickedFeature.color, selected.originalColor);
          }
          
          // Highlight newly selected feature
          pickedFeature.color = Cesium.Color.LIME;
          
          // Set feature infobox description
          var featureName = pickedFeature.getProperty("name");
          selectedEntity.name = featureName;
          selectedEntity.description =
            'Loading <div class="cesium-infoBox-loading"></div>';
          viewer.selectedEntity = selectedEntity;
          selectedEntity.description =
            '<table class="cesium-infoBox-defaultTable"><tbody>' +
            "<tr><th>Global ID</th><td>" +
            pickedFeature.getProperty("globalid") +
            "</td></tr>" +
            "<tr><th>Name</th><td>" +
            pickedFeature.getProperty("name") +
            "</td></tr>" +
            "<tr><th>Description</th><td>" +
            pickedFeature.getProperty("description") +
            "</td></tr>" +
            "<tr><th>Long name</th><td>" +
            pickedFeature.getProperty("longname") +
            "</td></tr>" +
            "<tr><th>Party</th><td>" +
            pickedFeature.getProperty("party") +
            "</td></tr>" +
            "<tr><th>Rights</th><td>" +
            pickedFeature.getProperty("rights") +
            "</td></tr>" +
            "<tr><th>Restrictions</th><td>" +
            pickedFeature.getProperty("restrictions") +
            "</td></tr>" +
            "<tr><th>Responsibilities</th><td>" +
            pickedFeature.getProperty("responsibilities") +
            "</td></tr>" +
            '</tbody></table>';
        },
        Cesium.ScreenSpaceEventType.LEFT_CLICK);
      }

