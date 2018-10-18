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

// Other global variables
var shaderProgramObjectPhong;
var shaderProgramObjectSkybox;

var skyboxImageLoadCount = 0;

// Create a cube and sphere mesh object
var Skybox = Mesh.createCubeMap(500.0);

var RenderObjectCube;
var RenderObjectSphere;
var RenderObjectMesh;
var RenderObjectSkybox;

// Lighting and shading properties.
var LightPosition = GLMathLib.vec4(0.0, 20.0, 5.0, 0.0);

var LightAmbient = GLMathLib.vec4(0.065, 0.065, 0.065, 1.0);
var LightDiffuse = GLMathLib.vec4(1.0, 1.0, 1.0, 1.0);
var LightSpecular = GLMathLib.vec4(1.0, 1.0, 1.0, 1.0);

var MaterialAmbient = GLMathLib.vec4(1.0, 1.0, 1.0, 1.0);
var MaterialDiffuse = GLMathLib.vec4(0.75, 0.1, 0.0, 1.0);
var MaterialSpecular = GLMathLib.vec4(1.0, 1.0, 1.0, 1.0);

var AmbientProduct, DiffuseProduct, SpecularProduct;

var MatModel, MatView, MatProj, MatModelView, MatMVP;
var MatNormal;

var angle = 0;

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Main init and render loops.
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Init function.
function init()
{
    // Initialize the canvas.
    setCanvas();

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

    // Continue if WebGL works on the browser.
    gl.clearColor(0.0, 0.0, 0.0, 1.0);                      // Set the canvas background to pure black.
    gl.enable(gl.DEPTH_TEST);                               // Enable depth testing.
    gl.depthFunc(gl.LEQUAL);                                // Make near things obscure far things.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);    // Clear the color as well as the depth buffer.
    gl.viewport(0, 0, canvas.width, canvas.height);         // Make the viewport adhere to the canvas size.

    // Initialize the shaders.
    shaderProgramObjectPhong = new ShaderProgramObject(gl, "glsl/vertex.glsl", "glsl/fragment.glsl",
    {
        "AVertexPosition" : "vec3",
        "AVertexNormal" : "vec3",
        "ATextureCoord" : "vec2"
    },
    {
        // Vertex Uniforms
        "UCamPosition" : "vec4",
        "UCamPosSky" : "vec4",
        "ULightPosition" : "vec4",
        "UMatModel" : "mat4",
        "UMatMVP" : "mat4",
        "UMatNormal" : "mat4",
        // Fragment Uniforms
        "UAmbientProduct" : "vec4",
        "UDiffuseProduct" : "vec4",
        "USpecularProduct" : "vec4",
        "USamplerCube" : "samplerCube",
        "UMatViewInv" : "mat4",
        "UMatCameraRot" : "mat4"
    });

    shaderProgramObjectSkybox = new ShaderProgramObject(gl, "glsl/SkyboxVert.glsl", "glsl/SkyboxFrag.glsl",
    {
        "AVertexPosition" : "vec3"
    },
    {
        // Vertex Uniforms
        "UMatMVP" : "mat4",
        // Fragment Uniforms
        "USamplerCube" : "samplerCube"
    });

    // Initialize the buffers.
    RenderObjectCube = new RenderObject(gl, Mesh.createCube(),
    [
        shaderProgramObjectPhong.attributes["AVertexPosition"].glLocation,
        shaderProgramObjectPhong.attributes["AVertexNormal"].glLocation
    ]);
    RenderObjectSphere = new RenderObject(gl, Mesh.createSphere(4),
    [
        shaderProgramObjectPhong.attributes["AVertexPosition"].glLocation,
        shaderProgramObjectPhong.attributes["AVertexNormal"].glLocation
    ]);
    RenderObjectSkybox = new RenderObject(gl, Skybox,
    [
        shaderProgramObjectSkybox.attributes["AVertexPosition"].glLocation
    ]);

    // var mesh = Mesh.createMesh(FileUtil.GetFile("assets/SkyrimIronClaymore/SkyrimIronClaymore.obj"));
    var mesh = Mesh.createMesh(FileUtil.GetFile("assets/RZ-0/RZ-0.obj"));
    RenderObjectMesh = new RenderObject(gl, mesh,
    [
        shaderProgramObjectPhong.attributes["AVertexPosition"].glLocation,
        shaderProgramObjectPhong.attributes["AVertexNormal"].glLocation
    ]);

    // Initialize the skybox.
    initSkybox("Yokohama3");

    // Create the transformation matrix and calculate other matrices.
    MatModel = GLMathLib.mat4(1.0);
    MatView = GLMathLib.lookAt(Camera.at, Camera.eye, Camera.up);
    MatProj = GLMathLib.perspective(Settings.yFOV, Settings.aspectRatio, Settings.nearClipPlane, Settings.farClipPlane);
    MatModelView = GLMathLib.mult(MatView, MatModel);
    MatNormal = GLMathLib.transpose(GLMathLib.inverse(MatModelView));

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Phong Shader

    // Activate the shader.
    gl.useProgram(shaderProgramObjectPhong.glShaderProgram);

    // Pass some position variables to the shaders.
    shaderProgramObjectPhong.uniforms["UCamPosSky"].value = GLMathLib.vec4(Camera.eye, 0.0);

    // Create the lighting variables.
    AmbientProduct = GLMathLib.mult(LightAmbient, MaterialAmbient);
    DiffuseProduct = GLMathLib.mult(LightDiffuse, MaterialDiffuse);
    SpecularProduct = GLMathLib.mult(LightSpecular, MaterialSpecular);

    // Pass the lighting variables to the shaders.
    shaderProgramObjectPhong.uniforms["UAmbientProduct"].value = AmbientProduct;
    shaderProgramObjectPhong.uniforms["UDiffuseProduct"].value = DiffuseProduct;
    shaderProgramObjectPhong.uniforms["USpecularProduct"].value = SpecularProduct;

    ////////////////////////////////////////////////////////////////////////////////

    Control.init();
    Control.setMouseSensitivity(7.0);

    // Add an event listener to the input box.
    document.getElementById("obj-upload").addEventListener("change", function(e)
    {
        var file = e.target.files[0];
        if (!file)
        {
            return;
        }
        var reader = new FileReader();
        reader.onload = function(e)
        {
            var contents = e.target.result;
            meshRenderer = Mesh.createMesh(contents);
            Buffer.mesh = createMeshBuffer(meshRender.vertices, meshRender.normals, meshRender.indices);
        };
        reader.readAsText(file);
        Buffer.mesh = createMeshBuffer(meshRender.vertices, meshRender.normals, meshRender.indices);
    }, false);
}

// Render loop.
function render()
{
    ////////////////////////////
    // Perform general setup.

    // Create the camera transformation matrices.
    var MatCameraRot = GLMathLib.mat4(1.0);
    MatCameraRot = GLMathLib.translate(MatCameraRot, GLMathLib.vec3(0, 0, Control.var.mouseScroll));
    MatCameraRot = GLMathLib.rotate(MatCameraRot, -Control.var.angleY/Control.var.mouseSensitivity, GLMathLib.vec3(1, 0, 0));
    MatCameraRot = GLMathLib.rotate(MatCameraRot, -Control.var.angleX/Control.var.mouseSensitivity, GLMathLib.vec3(0, 1, 0));

    // Create a transformation matrix for only the skybox.
    var MatCameraRotSkybox = GLMathLib.mat4(1.0);
    MatCameraRotSkybox = GLMathLib.rotate(MatCameraRotSkybox, -Control.var.angleY/Control.var.mouseSensitivity, GLMathLib.vec3(1, 0, 0));
    MatCameraRotSkybox = GLMathLib.rotate(MatCameraRotSkybox, -Control.var.angleX/Control.var.mouseSensitivity, GLMathLib.vec3(0, 1, 0));

    // Calculate the inverse transformation matrices for the camera and skybox transformation matrices.
    var MatCameraRotInv = GLMathLib.inverse(MatCameraRot);
    var MatCameraRotSkyboxInv = GLMathLib.inverse(MatCameraRotSkybox);

    ////////////////////////////
    // Draw skybox.
    if (skyboxImageLoadCount === 6)
    {
        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false);

        // Activate the shader.
        gl.useProgram(shaderProgramObjectSkybox.glShaderProgram);
        gl.enableVertexAttribArray(shaderProgramObjectSkybox.attributes.AVertexPosition.glLocation);

        // Apply transformations.
        var MatSkybox = GLMathLib.mat4(1.0);
        MatSkybox = GLMathLib.mult(MatCameraRotSkyboxInv, MatSkybox);
        MatSkybox = GLMathLib.mult(MatModel, MatSkybox);
        MatSkybox = GLMathLib.mult(MatView, MatSkybox);
        MatSkybox = GLMathLib.mult(MatProj, MatSkybox);

        // Update specific uniforms.
        shaderProgramObjectSkybox.uniforms["UMatMVP"].value = new Float32Array(GLMathLib.flatten(MatSkybox));

        shaderProgramObjectSkybox.setUniforms();

        // Render.
        RenderObjectSkybox.render();

        gl.disableVertexAttribArray(shaderProgramObjectSkybox.attributes.AVertexPosition.glLocation);

        gl.depthMask(true);
        gl.enable(gl.DEPTH_TEST);
    }

    ////////////////////////////
    // Draw general meshes.
    if (skyboxImageLoadCount === 6)
    {
        // Activate the shader.
        gl.useProgram(shaderProgramObjectPhong.glShaderProgram);
        gl.enableVertexAttribArray(shaderProgramObjectPhong.attributes["AVertexPosition"].glLocation);
        gl.enableVertexAttribArray(shaderProgramObjectPhong.attributes["AVertexNormal"].glLocation);

        // Update general uniforms.
        var NewCameraPosition = GLMathLib.mult(MatCameraRotInv, GLMathLib.vec4(Camera.eye, 1.0));
        shaderProgramObjectPhong.uniforms["UCamPosition"].value = new Float32Array(NewCameraPosition);
        shaderProgramObjectPhong.uniforms["UMatViewInv"].value = new Float32Array(GLMathLib.flatten(GLMathLib.inverse(MatView)));
        var NewLightPosition = GLMathLib.mult(MatCameraRotInv, LightPosition);
        shaderProgramObjectPhong.uniforms["ULightPosition"].value = new Float32Array(NewLightPosition);
        shaderProgramObjectPhong.uniforms["UMatCameraRot"].value = new Float32Array(GLMathLib.flatten(MatCameraRot));

        // Draw cube.

        // // Apply transformations.
        // var MatCube = GLMathLib.mat4(1.0);
        // MatCube = GLMathLib.scale(MatCube, GLMathLib.vec3(1.3, 1.3, 1.3));
        // MatCube = GLMathLib.rotate(MatCube, angle/3, GLMathLib.vec3(1, 0, 0));
        // MatCube = GLMathLib.rotate(MatCube, angle/3, GLMathLib.vec3(0, 1, 0));
        // MatCube = GLMathLib.translate(MatCube, GLMathLib.vec3(3, 0, 0));

        // // Camera Rotation Matrix
        // MatCube = GLMathLib.mult(MatCameraRotInv, MatCube);
        // MatNormal = GLMathLib.transpose(GLMathLib.inverse(MatCube));
        // shaderProgramObjectPhong.uniforms["UMatModel"].value = new Float32Array(GLMathLib.flatten(MatCube));
        // MatCube = GLMathLib.mult(MatView, MatCube);
        // MatCube = GLMathLib.mult(MatProj, MatCube);
        // shaderProgramObjectPhong.uniforms["UMatMVP"].value = new Float32Array(GLMathLib.flatten(MatCube));
        // shaderProgramObjectPhong.uniforms["UMatNormal"].value = new Float32Array(GLMathLib.flatten(MatNormal));

        // shaderProgramObjectPhong.setUniforms();

        // // Render.
        // RenderObjectCube.render();

        // Draw Sphere

        // Apply transformations.
        // var MatSphere = GLMathLib.mat4(1.0);
        // MatSphere = GLMathLib.scale(MatSphere, GLMathLib.vec3(0.075, 0.075, 0.075));
        // MatSphere = GLMathLib.translate(MatSphere, GLMathLib.vec3(0, -3, 0));

        // // Camera Rotation Matrix
        // MatSphere = GLMathLib.mult(MatCameraRotInv, MatSphere);
        // MatNormal = GLMathLib.transpose(GLMathLib.inverse(MatSphere));
        // shaderProgramObjectPhong.uniforms["UMatModel"].value = new Float32Array(GLMathLib.flatten(MatSphere));
        // MatSphere = GLMathLib.mult(MatView, MatSphere);
        // MatSphere = GLMathLib.mult(MatProj, MatSphere);
        // shaderProgramObjectPhong.uniforms["UMatMVP"].value = new Float32Array(GLMathLib.flatten(MatSphere));
        // shaderProgramObjectPhong.uniforms["UMatNormal"].value = new Float32Array(GLMathLib.flatten(MatNormal));

        // shaderProgramObjectPhong.setUniforms();

        // // Render.
        // RenderObjectMesh.render();

        // Draw Mesh

        // Apply transformations.
        var MatMesh = GLMathLib.mat4(1.0);
        // MatMesh = GLMathLib.scale(MatMesh, GLMathLib.vec3(0.1, 0.1, 0.1));
        MatMesh = GLMathLib.scale(MatMesh, GLMathLib.vec3(0.04, 0.04, 0.04));
        MatMesh = GLMathLib.translate(MatMesh, GLMathLib.vec3(0, -5, 0));

        // Camera Rotation Matrix
        MatMesh = GLMathLib.mult(MatCameraRotInv, MatMesh);
        MatNormal = GLMathLib.transpose(GLMathLib.inverse(MatMesh));
        shaderProgramObjectPhong.uniforms["UMatModel"].value = new Float32Array(GLMathLib.flatten(MatMesh));
        MatMesh = GLMathLib.mult(MatView, MatMesh);
        MatMesh = GLMathLib.mult(MatProj, MatMesh);
        shaderProgramObjectPhong.uniforms["UMatMVP"].value = new Float32Array(GLMathLib.flatten(MatMesh));
        shaderProgramObjectPhong.uniforms["UMatNormal"].value = new Float32Array(GLMathLib.flatten(MatNormal));

        shaderProgramObjectPhong.setUniforms();

        // Render.
        RenderObjectMesh.render();

        // Disable shader attributes.
        gl.disableVertexAttribArray(shaderProgramObjectPhong.attributes["AVertexPosition"].glLocation);
        gl.disableVertexAttribArray(shaderProgramObjectPhong.attributes["AVertexNormal"].glLocation);
    }

    // Angle
    angle += 1.0;

    // Call render again because we are looping it.
    window.requestAnimFrame(render, canvas);
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
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Helper functions.
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Initialize separate settings for the canvas.
function setCanvas()
{
    var innerAspectRatio = window.innerWidth / window.innerHeight;
    var canvasWidth, canvasHeight;
    if (innerAspectRatio > Settings.aspectRatio)
    {
        canvasHeight = window.innerHeight;
        canvasWidth = canvasHeight * Settings.aspectRatio;
    }
    else
    {
        canvasWidth = window.innerWidth;
        canvasHeight = canvasWidth * 1.0 / Settings.aspectRatio;
    }
    canvas.setAttribute("width", String(canvasWidth));
    canvas.setAttribute("height", String(canvasHeight));
}

//
// Initialize the cube map. Code inspiration from
// http://hristo.oskov.com/projects/cs418/mp3/js/mp3.js and, in
// a way, three.js's implementation of a skybox.
//
function initSkybox(string)
{
    skyboxImageLoadCount = 0;

    gl.activeTexture(gl.TEXTURE0);

    Skybox.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, Skybox.texture);

    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    var cubeFaces =
    [
        ["assets/skybox/" + string + "/posx.jpg", gl.TEXTURE_CUBE_MAP_POSITIVE_X],
        ["assets/skybox/" + string + "/negx.jpg", gl.TEXTURE_CUBE_MAP_NEGATIVE_X],
        ["assets/skybox/" + string + "/posy.jpg", gl.TEXTURE_CUBE_MAP_POSITIVE_Y],
        ["assets/skybox/" + string + "/negy.jpg", gl.TEXTURE_CUBE_MAP_NEGATIVE_Y],
        ["assets/skybox/" + string + "/posz.jpg", gl.TEXTURE_CUBE_MAP_POSITIVE_Z],
        ["assets/skybox/" + string + "/negz.jpg", gl.TEXTURE_CUBE_MAP_NEGATIVE_Z]
    ];

    for (var i = 0; i < cubeFaces.length; i++)
    {
        var image = new Image();
        image.onload = function(texture, face, image)
        {
            return function()
            {
                gl.activeTexture(gl.TEXTURE0);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture)
                gl.texImage2D(face, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                skyboxImageLoadCount++;
            }
        } (Skybox.texture, cubeFaces[i][1], image);
        image.src = cubeFaces[i][0];
    }
}
