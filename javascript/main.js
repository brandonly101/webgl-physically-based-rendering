// Copyright Brandon Ly 2015 all rights reserved.

// WebGL Code to also learn about implementing physically based rendering.

"use strict";

// Get our HTML WebGL Canvas.
var canvas = document.getElementById("webgl-canvas");
// if (canvas.webkitRequestFullScreen)
// {
//     canvas.webkitRequestFullScreen();
// }
// else
// {
//     canvas.mozRequestFullScreen();
// }

// Create our WebGL variable, where we will use our WebGL API functions.
var gl;

// Get the context into a local gl and and a public gl.
// Use preserveDrawingBuffer:true to keep the drawing buffer after
// presentation. Fail if context is not found.
try
{
    gl = WebGLUtils.setupWebGL(canvas);
}
catch (e)
{
    console.log("Getting context failed!");
}

// Render object references
var RenderObjectMesh;

var RenderObjectCore = null;
var RenderObjectSphere = null;
var RenderObjectMedievalHelmet = null;
var RenderObjectChair = null;

var RenderObjectMeshSkybox;

var ROSkyboxes = {};

// Lighting and shading properties.
var LightDirectPos = GLMathLib.vec4(1024.0, 201.0, 184.0, 0.0);
var LightDirectDir = GLMathLib.vec3(0.35, 1.0, 1.0);

var MatModel, MatView, MatProj, MatMV, MatMVP, MatNormal;

class DatGuiParameters
{
    constructor()
    {
        this.Skybox = [ 'Shiodome Stairs', 'Modern Buildings', 'Schadowplatz', 'Spruit Sunrise', 'Whipple Creek' ];
        this.Model = [ 'Medieval Helmet', 'ARC Pulse Core', 'Eames Lounge Chair', 'Sphere' ];
        this.OverridePBR = false;
        this.Color = [255, 255, 255];
        this.Metallic = 0.0;
        this.Roughness = 0.0;
    }
}

var datGuiParams = new DatGuiParameters();
var gui = new dat.GUI();

const ENV_MIP_LEVELS = 9;
const ENV_MIP_LEVELS_MIN = 5;

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Main init and render loops.
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Init function.
function init()
{
    // Initialize the canvas.
    setCanvas();

    resetViewport();

    // Initialize the renderable objects.

    // Set the default loaded skybox
    loadSkybox("ShiodomeStairs");
    RenderObjectMeshSkybox = ROSkyboxes["ShiodomeStairs"];

    loadMeshMedievalHelmet();

    // Sphere
    var materialSphere = new MaterialPBR(gl);
    var meshSphere = Mesh.createSphere(5, materialSphere);
    RenderObjectSphere = new RenderObject(gl, meshSphere);
    RenderObjectSphere.setUniformValue("UUseWorldSpace", 1);

    // Set the default loaded model
    RenderObjectMesh = RenderObjectMedievalHelmet;

    // Create the transformation matrix and calculate other matrices.
    MatModel = GLMathLib.mat4(1.0);
    MatView = GLMathLib.lookAt(Camera.at, Camera.eye, Camera.up);
    MatProj = GLMathLib.perspective(Settings.yFOV, window.innerWidth / window.innerHeight, Settings.nearClipPlane, Settings.farClipPlane);
    MatMV = GLMathLib.mult(MatView, MatModel);
    MatNormal = GLMathLib.transpose(GLMathLib.inverse(MatMV));

    ////////////////////////////////////////////////////////////////////////////////

    Control.init();
    Control.setMouseSensitivity(3.5);
}

// Render loop.
function render()
{
    window.requestAnimFrame(render, canvas);

    ////////////////////////////////////////////////////////////////////////////////
    // Perform general setup.

    // Create the camera transformation matrices.
    MatView = GLMathLib.mat4(1.0);
    MatView = GLMathLib.rotate(MatView, Control.var.angleX/Control.var.mouseSensitivity, GLMathLib.vec3(0, 1, 0));
    MatView = GLMathLib.rotate(MatView, Control.var.angleY/Control.var.mouseSensitivity, GLMathLib.vec3(1, 0, 0));
    MatView = GLMathLib.translate(MatView, GLMathLib.vec3(0, 0, Control.var.mouseScroll/Control.var.mouseSensitivity - 10));

    // Create a transformation matrix for only the skybox.
    var MatViewSkybox = GLMathLib.mat4(1.0);
    MatViewSkybox = GLMathLib.rotate(MatViewSkybox, Control.var.angleX/Control.var.mouseSensitivity, GLMathLib.vec3(0, 1, 0));
    MatViewSkybox = GLMathLib.rotate(MatViewSkybox, Control.var.angleY/Control.var.mouseSensitivity, GLMathLib.vec3(1, 0, 0));

    ////////////////////////////////////////////////////////////////////////////////
    // Draw skybox.

    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);

    // Apply transformations.
    var MatSkybox = GLMathLib.mat4(1.0);
    MatSkybox = GLMathLib.mult(MatViewSkybox, MatSkybox);
    MatSkybox = GLMathLib.mult(MatProj, MatSkybox);
    RenderObjectMeshSkybox.setUniformValue("UMatMVP", GLMathLib.flatten(MatSkybox));

    // Render.
    RenderObjectMeshSkybox.render();

    gl.depthMask(true);
    gl.enable(gl.DEPTH_TEST);

    ////////////////////////////////////////////////////////////////////////////////
    // Draw general meshes.

    // Pass in the camera position in world space.
    var NewCameraPosition = GLMathLib.mult(GLMathLib.inverse(MatView), GLMathLib.vec4(0, 0, 0, 1.0));
    RenderObjectMesh.setUniformValue("UCamPosition", NewCameraPosition);

    // Set the light position.
    RenderObjectMesh.setUniformValue("ULightDirectPos", LightDirectPos);
    RenderObjectMesh.setUniformValue("ULightDirectDir", LightDirectDir);

    // Apply transformations.
    var MatMesh = GLMathLib.mat4(1.0);
    RenderObjectMesh.setUniformValue("UMatModel", GLMathLib.flatten(MatMesh));
    MatMesh = GLMathLib.mult(MatView, MatMesh);
    RenderObjectMesh.setUniformValue("UMatView", GLMathLib.flatten(MatMesh));
    RenderObjectMesh.setUniformValue("UMatMV", GLMathLib.flatten(MatMesh));
    MatNormal = GLMathLib.transpose(GLMathLib.inverse(MatMesh));
    RenderObjectMesh.setUniformValue("UMatNormal", GLMathLib.flatten(MatNormal));
    RenderObjectMesh.setUniformValue("UMatProj", GLMathLib.flatten(MatProj));

    MatMesh = GLMathLib.mult(MatProj, MatMesh);
    RenderObjectMesh.setUniformValue("UMatMVP", GLMathLib.flatten(MatMesh));

    RenderObjectMesh.setUniformValue("UEnvMipLevels", ENV_MIP_LEVELS);
    RenderObjectMesh.setUniformValue("UEnvMipLevelsMin", ENV_MIP_LEVELS_MIN);

    RenderObjectMesh.setUniformValue("UOverride", datGuiParams.OverridePBR ? 1 : 0);
    let color = GLMathLib.mult(1.0 / 255.0, datGuiParams.Color);
    RenderObjectMesh.setUniformValue("UColor", color);
    RenderObjectMesh.setUniformValue("UMetallic", datGuiParams.Metallic);
    RenderObjectMesh.setUniformValue("URoughness", datGuiParams.Roughness);

    // Render.
    RenderObjectMesh.render();
}

window.onresize = () =>
{
    // Reset the canvas and viewport whenever the window is resized.
    setCanvas();
    gl.viewport(0, 0, canvas.width, canvas.height);
};

// Load it all!
window.onload = () =>
{
    // Initialize the WebGL canvas.
    init();

    // Render the WebGL canvas.
    render();

    // Add dat.gui stuff
    gui.closed = false;
    const fSkybox = gui.addFolder('Skybox');
    const SkyboxDropdown = fSkybox.add(datGuiParams, 'Skybox', datGuiParams.Skybox);
    SkyboxDropdown.setValue(datGuiParams.Skybox[0]);
    SkyboxDropdown.onFinishChange((value) =>
    {
        let skyboxToLoad = "";
        switch(value)
        {
            case "Shiodome Stairs":
                LightDirectPos = GLMathLib.vec4(1024.0, 201.0, 184.0, 0.0);
                skyboxToLoad = "ShiodomeStairs";
                break;
            case "Modern Buildings":
                LightDirectPos = GLMathLib.vec4(-1024.0, 80.0, -514.0, 0.0);
                skyboxToLoad = "ModernBuildingsNight";
                break;
            case "Schadowplatz":
                LightDirectPos = GLMathLib.vec4(0.0, 1.0, 0.0, 0.0);
                skyboxToLoad = "Schadowplatz";
                break;
            case "Spruit Sunrise":
                LightDirectPos = GLMathLib.vec4(648.0, 157.0, 1024.0, 0.0);
                skyboxToLoad = "SpruitSunrise";
                break;
            case "Whipple Creek":
                LightDirectPos = GLMathLib.vec4(0.0, 1.0, 0.0, 0.0);
                skyboxToLoad = "WhippleCreek";
                break;
        }
        if (!(skyboxToLoad in ROSkyboxes))
        {
            loadSkybox(skyboxToLoad);
        }
        RenderObjectMeshSkybox = ROSkyboxes[skyboxToLoad];
    });
    fSkybox.closed = false;

    const fModelParams = gui.addFolder('3D Model Parameters');
    const ModelDropdown = fModelParams.add(datGuiParams, 'Model', datGuiParams.Model);
    const ColorParam = fModelParams.addColor(datGuiParams, 'Color');
    const OverridePBRParam = fModelParams.add(datGuiParams, 'OverridePBR');
    const MetallicParam = fModelParams.add(datGuiParams, 'Metallic', 0.0, 1.0);
    const RoughnessParam = fModelParams.add(datGuiParams, 'Roughness', 0.0, 1.0);
    fModelParams.closed = false;

    ModelDropdown.setValue(datGuiParams.Model[0]);
    ModelDropdown.onFinishChange((value) =>
    {
        switch (value)
        {
            case "ARC Pulse Core":
                if (RenderObjectCore == null)
                {
                    loadMeshCore();
                }
                RenderObjectMesh = RenderObjectCore;
                ColorParam.setValue([255,255,255]);
                OverridePBRParam.setValue(false);
                MetallicParam.setValue(0);
                RoughnessParam.setValue(0);
                break;
            case "Medieval Helmet":
                if (RenderObjectMedievalHelmet == null)
                {
                    loadMeshMedievalHelmet();
                }
                RenderObjectMesh = RenderObjectMedievalHelmet;
                ColorParam.setValue([255,255,255]);
                OverridePBRParam.setValue(false);
                MetallicParam.setValue(0);
                RoughnessParam.setValue(0);
                break;
            case "Eames Lounge Chair":
                if (RenderObjectChair == null)
                {
                    loadMeshEamesLoungeChair();
                }
                RenderObjectMesh = RenderObjectChair;
                ColorParam.setValue([255,255,255]);
                OverridePBRParam.setValue(false);
                MetallicParam.setValue(0);
                RoughnessParam.setValue(0);
                break;
            case "Sphere":
                RenderObjectMesh = RenderObjectSphere;
                ColorParam.setValue([255,0,0]);
                OverridePBRParam.setValue(true);
                MetallicParam.setValue(0);
                RoughnessParam.setValue(0);
                break;
        }
    });
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Helper functions.
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Initialize separate settings for the canvas.
function setCanvas()
{
    canvas.setAttribute("width", String(window.innerWidth));
    canvas.setAttribute("height", String(window.innerHeight));
    MatProj = GLMathLib.perspective(Settings.yFOV, window.innerWidth / window.innerHeight, Settings.nearClipPlane, Settings.farClipPlane);
}

function resetViewport()
{
    gl.clearColor(0.0, 0.0, 0.0, 1.0);                      // Set the canvas background to pure black.
    gl.enable(gl.DEPTH_TEST);                               // Enable depth testing.
    gl.depthFunc(gl.LEQUAL);                                // Make near things obscure far things.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);    // Clear the color as well as the depth buffer.
    gl.viewport(0, 0, canvas.width, canvas.height);         // Make the viewport adhere to the canvas size.
}

function loadSkybox(skyboxName)
{
    var materialSkybox = new MaterialSkybox(gl);
    var MeshSkybox = Mesh.createCubeMap(500.0, materialSkybox);
    ROSkyboxes[skyboxName] = new RenderObjectSkybox(gl, MeshSkybox);
    materialSkybox.setSkyboxTexture(skyboxName, ENV_MIP_LEVELS, ENV_MIP_LEVELS_MIN, () =>
    {
        ROSkyboxes[skyboxName].renderToIrradianceMap();
        ROSkyboxes[skyboxName].renderToSpecIBLMap();
        resetViewport();
    });
}

function loadMeshMedievalHelmet()
{
    // Medieval Helmet
    var materialMedievalHelmet = new MaterialPBR(gl);
    materialMedievalHelmet.setBaseColorTexture("assets/MedievalHelmet/textures/DefaultMaterial_Base_Color.png");
    materialMedievalHelmet.setNormalTexture("assets/MedievalHelmet/textures/DefaultMaterial_Normal_DirectX.png");
    materialMedievalHelmet.setMetallicTexture("assets/MedievalHelmet/textures/DefaultMaterial_Metallic.png");
    materialMedievalHelmet.setRoughnessTexture("assets/MedievalHelmet/textures/DefaultMaterial_Roughness.png");
    var meshMedievalHelmet = Mesh.createMesh(
        "assets/MedievalHelmet/source/MedievalHelmet.obj",
        [materialMedievalHelmet]
    );
    RenderObjectMedievalHelmet = new RenderObject(gl, meshMedievalHelmet);
    RenderObjectMedievalHelmet.setUniformValue("UUseWorldSpace", 0);
}

function loadMeshCore()
{
    // ARC Pulse Core with PBR-authored textures
    var meshMaterialPalletStack = new MaterialPBR(gl);
    meshMaterialPalletStack.setBaseColorTexture("assets/arc-pulse-core/textures/MAT_PalletStack_01_Base_Color.png");
    meshMaterialPalletStack.setNormalTexture("assets/arc-pulse-core/textures/MAT_PalletStack_01_Normal_DirectX.png");
    meshMaterialPalletStack.setMetallicTexture("assets/arc-pulse-core/textures/MAT_PalletStack_01_Metallic.png");
    meshMaterialPalletStack.setRoughnessTexture("assets/arc-pulse-core/textures/MAT_PalletStack_01_Roughness.png");
    var meshMaterialPulseFilter = new MaterialPBR(gl);
    meshMaterialPulseFilter.setBaseColorTexture("assets/arc-pulse-core/textures/MAT_PulseFilter_Base_Color.png");
    meshMaterialPulseFilter.setNormalTexture("assets/arc-pulse-core/textures/MAT_PulseFilter_Normal_DirectX.png");
    meshMaterialPulseFilter.setMetallicTexture("assets/arc-pulse-core/textures/MAT_PulseFilter_Metallic.png");
    meshMaterialPulseFilter.setRoughnessTexture("assets/arc-pulse-core/textures/MAT_PulseFilter_Roughness.png");
    var meshMaterialPallets = new MaterialPBR(gl);
    meshMaterialPallets.setBaseColorTexture("assets/arc-pulse-core/textures/MAT_Scifi_Pallets_Base_Color.png");
    meshMaterialPallets.setNormalTexture("assets/arc-pulse-core/textures/MAT_Scifi_Pallets_Normal_DirectX.png");
    meshMaterialPallets.setMetallicTexture("assets/arc-pulse-core/textures/MAT_Scifi_Pallets_Metallic.png");
    meshMaterialPallets.setRoughnessTexture("assets/arc-pulse-core/textures/MAT_Scifi_Pallets_Roughness.png");
    var meshMaterialArray = [];
    for (let i = 0; i < 36; i++)
    {
        meshMaterialArray.push(meshMaterialPalletStack);
    }
    meshMaterialArray[1] = meshMaterialPulseFilter;
    meshMaterialArray[2] = meshMaterialPallets;
    meshMaterialArray[22] = meshMaterialPallets;
    var meshCore = Mesh.createMesh(
        "assets/arc-pulse-core/source/PalletStack01_Paint/PalletStack01_Paint_v2.obj",
        meshMaterialArray
    );
    RenderObjectCore = new RenderObject(gl, meshCore);
    RenderObjectCore.setUniformValue("UUseWorldSpace", 0);
}

function loadMeshEamesLoungeChair()
{
    // Eames Lounge Chair
    var materialChair = new MaterialPBR(gl);
    materialChair.setBaseColorTexture("assets/EamesLoungeChair/textures/EamesChair_Combined_A3.jpg");
    materialChair.setNormalTexture("assets/EamesLoungeChair/textures/EamesChair_Combined_N.jpg");
    materialChair.setMetallicTexture("assets/EamesLoungeChair/textures/EamesChair_Combined_M.jpg");
    materialChair.setRoughnessTexture("assets/EamesLoungeChair/textures/EamesChair_Combined_R.jpg");
    var materialChairFoot = new MaterialPBR(gl);
    materialChairFoot.setBaseColorTexture("assets/EamesLoungeChair/textures/EamesFootrest_BaseColor3.jpg");
    materialChairFoot.setNormalTexture("assets/EamesLoungeChair/textures/EamesFootrest_N.jpg");
    materialChairFoot.setMetallicTexture("assets/EamesLoungeChair/textures/EamesFootrest_M.jpg");
    materialChairFoot.setRoughnessTexture("assets/EamesLoungeChair/textures/EamesFootrest_R.jpg");
    var materialChairArray = [];
    for (let i = 0; i < 35; i++) materialChairArray.push(materialChair);
    materialChairArray[15] = materialChairFoot;
    materialChairArray[16] = materialChairFoot;
    materialChairArray[17] = materialChairFoot;
    materialChairArray[18] = materialChairFoot;
    materialChairArray[29] = materialChairFoot;
    var meshChair = Mesh.createMesh(
        "assets/EamesLoungeChair/Eames_Chair_LP.obj",
        materialChairArray
    );
    RenderObjectChair = new RenderObject(gl, meshChair);
    RenderObjectChair.setUniformValue("UUseWorldSpace", 0);
}
