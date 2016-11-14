// Copyright Brandon Ly 2015 all rights reserved.

// WebGL Code to also learn about implementing physically based rendering.
"use strict";

// Get our HTML WebGL Canvas.
var canvas = document.getElementById("webgl-canvas");
// if (canvas.webkitRequestFullScreen) {
//     canvas.webkitRequestFullScreen();
// } else {
//     canvas.mozRequestFullScreen();
// }

// Create our WebGL variable, where we will use our WebGL API functions.
var gl;

// Other global variables
var shaderProgram;
var shaderVar = {};
var vertexPositionAttribute;
var vertexColorAttribute;

// Vertex Buffer variables
var Buffer = Buffer || {};
Buffer.cube = {};
Buffer.sphere = {};
Buffer.skybox = {};
Buffer.mesh = {};

// Create a cube and sphere mesh object
var Cube = MeshLib.createCube();
var meshRender = MeshLib.createCube();
var Sphere = MeshLib.createSphere(4);
var Skybox = MeshLib.createCubeMap(500.0);

// Lighting and shading properties.
var LightPosition = GLMathLib.vec4(0.0, 20.0, 5.0, 0.0);

var LightAmbient = GLMathLib.vec4(0.065, 0.065, 0.065, 1.0);
var LightDiffuse = GLMathLib.vec4(1.0, 1.0, 1.0, 1.0);
var LightSpecular = GLMathLib.vec4(1.0, 1.0, 1.0, 1.0);

var MaterialAmbient = GLMathLib.vec4(1.0, 1.0, 1.0, 1.0);
var MaterialDiffuse = GLMathLib.vec4(0.75, 0.1, 0.0, 1.0);
var MaterialSpecular = GLMathLib.vec4(1.0, 1.0, 1.0, 1.0);

var AmbientProduct, DiffuseProduct, SpecularProduct;

var Camera = {
    at : GLMathLib.vec3(0.0, 0.0, 0.0),
    eye : GLMathLib.vec3(0.0, 0.0, 10.0),
    up : GLMathLib.vec3(0.0, 1.0, 0.0),
};

var MatModel, MatView, MatProj, MatModelView;
var MatNormal;

var angle = 0;

////////////////////////////////////////////////////////////////
// Main init and render loops.
////////////////////////////////////////////////////////////////

// Init function.
function init() {
    // Initialize the canvas.
    setCanvas();

    // Get the context into a local gl and and a public gl.
    // Use preserveDrawingBuffer:true to keep the drawing buffer after
    // presentation. Fail if context is not found.
    try {
        gl = WebGLUtils.setupWebGL(canvas);
    } catch (e) {
        console.log("Getting context failed!");
    }

    // Continue if WebGL works on the browser.
    gl.clearColor(0.0, 0.0, 0.0, 1.0);                      // Set the canvas background to pure black.
    gl.enable(gl.DEPTH_TEST);                               // Enable depth testing.
    gl.depthFunc(gl.LEQUAL);                                // Make near things obscure far things.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);    // Clear the color as well as the depth buffer.
    gl.viewport(0, 0, canvas.width, canvas.height);         // Make the viewport adhere to the canvas size.

    // Initialize the shaders.
    initShaders();

    // Initialize the shader variable locations.
    initShaderVar();

    // Initialize the buffers.
    initBuffers();

    // Initialize the skybox.
    initSkybox("Yokohama3");

    // Initialize some parameters for the scene.

    // Clear the color as well as the depth buffer.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.clearColor(0.15, 0.15, 0.15, 1.0);

    // Create the transformation matrix and calculate other matrices.
    MatModel = GLMathLib.mat4(1.0);
    MatView = GLMathLib.lookAt(Camera.at, Camera.eye, Camera.up);
    MatProj = GLMathLib.perspective(Settings.yFOV, Settings.aspectRatio, Settings.nearClipPlane, Settings.farClipPlane);
    MatModelView = GLMathLib.mult(MatView, MatModel);
    MatNormal = GLMathLib.transpose(GLMathLib.inverse(MatModelView));

    // Pass some position variables to the shaders.
    gl.uniform4fv(shaderVar["UCamPosition"], new Float32Array(GLMathLib.vec4(Camera.eye, 0.0)));
    gl.uniform4fv(shaderVar["UCamPosSky"], new Float32Array(GLMathLib.vec4(Camera.eye, 0.0)));

    // Pass the transformation matrix components to the shaders.
    gl.uniformMatrix4fv(shaderVar["UMatModel"], false, new Float32Array(GLMathLib.flatten(MatModel)));
    gl.uniformMatrix4fv(shaderVar["UMatView"], false, new Float32Array(GLMathLib.flatten(MatView)));
    gl.uniformMatrix4fv(shaderVar["UMatProj"], false, new Float32Array(GLMathLib.flatten(MatProj)));
    gl.uniformMatrix4fv(shaderVar["UMatNormal"], false, new Float32Array(GLMathLib.flatten(MatNormal)));

    // Create the lighting variables.
    AmbientProduct = GLMathLib.mult(LightAmbient, MaterialAmbient);
    DiffuseProduct = GLMathLib.mult(LightDiffuse, MaterialDiffuse);
    SpecularProduct = GLMathLib.mult(LightSpecular, MaterialSpecular);

    // Pass the lighting variables to the shaders.
    gl.uniform4fv(shaderVar["UAmbientProduct"], new Float32Array(AmbientProduct));
    gl.uniform4fv(shaderVar["UDiffuseProduct"], new Float32Array(DiffuseProduct));
    gl.uniform4fv(shaderVar["USpecularProduct"], new Float32Array(SpecularProduct));

    // Enable Attribute Pointers
    gl.enableVertexAttribArray(shaderVar["AVertexPosition"]);
    gl.enableVertexAttribArray(shaderVar["AVertexNormal"]);

    Control.init();
    Control.setMouseSensitivity(7.0);

    // Add an event listener to the input box.
    document.getElementById("obj-upload").addEventListener("change", function(e) {
        var file = e.target.files[0];
        if (!file) {
            return;
        }
        var reader = new FileReader();
        reader.onload = function(e) {
            var contents = e.target.result;
            meshRenderer = MeshLib.createMesh(contents);
            Buffer.mesh = createMeshBuffer(meshRender.vertices, meshRender.normals, meshRender.indices);
        };
        reader.readAsText(file);
        Buffer.mesh = createMeshBuffer(meshRender.vertices, meshRender.normals, meshRender.indices);
    }, false);

}

// Render loop.
function render() {
    setCanvas();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.viewport(0, 0, canvas.width, canvas.height);

    ////////////////////////////
    // Perform general setup.

    // Create the camera rotation matrices.
    var MatCameraRot = GLMathLib.mat4(1.0);
    MatCameraRot = GLMathLib.rotate(MatCameraRot, -Control.var.angleY/Control.var.mouseSensitivity, GLMathLib.vec3(1, 0, 0));
    MatCameraRot = GLMathLib.rotate(MatCameraRot, -Control.var.angleX/Control.var.mouseSensitivity, GLMathLib.vec3(0, 1, 0));
    gl.uniformMatrix4fv(shaderVar["UMatCameraRot"], false, new Float32Array(GLMathLib.flatten(MatCameraRot)));
    var MatCameraRotOpp = GLMathLib.mat4(1.0);
    MatCameraRotOpp = GLMathLib.rotate(MatCameraRotOpp, Control.var.angleX/Control.var.mouseSensitivity, GLMathLib.vec3(0, 1, 0));
    MatCameraRotOpp = GLMathLib.rotate(MatCameraRotOpp, Control.var.angleY/Control.var.mouseSensitivity, GLMathLib.vec3(1, 0, 0));

    // Update general uniforms.
    var NewCameraPosition = GLMathLib.mult(MatCameraRotOpp, GLMathLib.vec4(Camera.eye, 1.0));
    gl.uniform4fv(shaderVar["UCamPosition"], new Float32Array(NewCameraPosition));
    gl.uniformMatrix4fv(shaderVar["UMatViewInv"], false, new Float32Array(GLMathLib.flatten(GLMathLib.inverse(MatView))));
    var NewLightPosition = GLMathLib.mult(MatCameraRotOpp, LightPosition);
    gl.uniform4fv(shaderVar["ULightPosition"], new Float32Array(NewLightPosition));

    ////////////////////////////
    // Draw skybox.

    gl.depthMask(false);
    gl.uniform1i(shaderVar["USkybox"], true);

    // Rebind buffers.
    gl.bindBuffer(gl.ARRAY_BUFFER, Buffer.skybox.vertices);
    gl.vertexAttribPointer(shaderVar["AVertexPosition"], 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Buffer.skybox.indices);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, Skybox.texture);
    gl.uniform1i(gl.getUniformLocation(shaderProgram, "USamplerCube"), 0);

    // Apply transformations.
    var MatSkybox = GLMathLib.mat4(1.0);
    MatSkybox = GLMathLib.mult(MatCameraRotOpp, MatSkybox);
    MatSkybox = GLMathLib.mult(MatModel, MatSkybox);

    // Update specific uniforms.
    gl.uniformMatrix4fv(shaderVar["UMatModel"], false, new Float32Array(GLMathLib.flatten(MatSkybox)));

    // Render.
    gl.drawElements(gl.TRIANGLES, Skybox.indices.length, gl.UNSIGNED_SHORT, 0);

    gl.uniform1i(shaderVar["USkybox"], false);
    gl.depthMask(true);

    ////////////////////////////
    // Draw cube.

    // // Rebind buffers.
    // gl.bindBuffer(gl.ARRAY_BUFFER, Buffer.cube.vertices);
    // gl.vertexAttribPointer(shaderVar["AVertexPosition"], 3, gl.FLOAT, false, 0, 0);
    // gl.bindBuffer(gl.ARRAY_BUFFER, Buffer.cube.normals);
    // gl.vertexAttribPointer(shaderVar["AVertexNormal"], 3, gl.FLOAT, false, 0, 0);
    // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Buffer.cube.indices);

    // // Apply transformations.
    // var MatCube = GLMathLib.mat4(1.0);
    // MatCube = GLMathLib.scale(MatCube, GLMathLib.vec3(1.3, 1.3, 1.3));
    // MatCube = GLMathLib.rotate(MatCube, angle/3, GLMathLib.vec3(1, 0, 0));
    // MatCube = GLMathLib.rotate(MatCube, angle/3, GLMathLib.vec3(0, 1, 0));
    // MatCube = GLMathLib.translate(MatCube, GLMathLib.vec3(3, 0, 0));
    // // Camera Rotation Matrix
    // MatCube = GLMathLib.mult(MatCameraRotOpp, MatCube);
    // MatNormal = GLMathLib.transpose(GLMathLib.inverse(MatCube));
    // gl.uniformMatrix4fv(shaderVar["UMatModel"], false, new Float32Array(GLMathLib.flatten(MatCube)));
    // gl.uniformMatrix4fv(shaderVar["UMatNormal"], false, new Float32Array(GLMathLib.flatten(MatNormal)));

    // // Render.
    // gl.drawElements(gl.TRIANGLES, Cube.indices.length, gl.UNSIGNED_SHORT, 0);
    // Rebind buffers.
    gl.bindBuffer(gl.ARRAY_BUFFER, Buffer.mesh.vertices);
    gl.vertexAttribPointer(shaderVar["AVertexPosition"], 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, Buffer.mesh.normals);
    gl.vertexAttribPointer(shaderVar["AVertexNormal"], 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Buffer.mesh.indices);

    // Apply transformations.
    var MatCube = GLMathLib.mat4(1.0);
    MatCube = GLMathLib.scale(MatCube, GLMathLib.vec3(1.3, 1.3, 1.3));
    MatCube = GLMathLib.rotate(MatCube, angle/3, GLMathLib.vec3(1, 0, 0));
    MatCube = GLMathLib.rotate(MatCube, angle/3, GLMathLib.vec3(0, 1, 0));
    MatCube = GLMathLib.translate(MatCube, GLMathLib.vec3(3, 0, 0));
    // Camera Rotation Matrix
    MatCube = GLMathLib.mult(MatCameraRotOpp, MatCube);
    MatNormal = GLMathLib.transpose(GLMathLib.inverse(MatCube));
    gl.uniformMatrix4fv(shaderVar["UMatModel"], false, new Float32Array(GLMathLib.flatten(MatCube)));
    gl.uniformMatrix4fv(shaderVar["UMatNormal"], false, new Float32Array(GLMathLib.flatten(MatNormal)));

    // Render.
    gl.drawElements(gl.TRIANGLES, Cube.indices.length, gl.UNSIGNED_SHORT, 0);

    ////////////////////////////
    // Draw Sphere

    // Rebind Buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, Buffer.sphere.vertices);
    gl.vertexAttribPointer(shaderVar["AVertexPosition"], 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, Buffer.sphere.normals);
    gl.vertexAttribPointer(shaderVar["AVertexNormal"], 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Buffer.sphere.indices);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, Skybox.texture);

    var MatSphere = GLMathLib.mat4(1.0);
    MatSphere = GLMathLib.scale(MatSphere, GLMathLib.vec3(2, 2, 2));
    MatSphere = GLMathLib.translate(MatSphere, GLMathLib.vec3(-3, 0, 0));
    // Camera Rotation Matrix
    MatSphere = GLMathLib.mult(MatCameraRotOpp, MatSphere);
    MatNormal = GLMathLib.transpose(GLMathLib.inverse(MatSphere));
    gl.uniformMatrix4fv(shaderVar["UMatModel"], false, new Float32Array(GLMathLib.flatten(MatSphere)));
    gl.uniformMatrix4fv(shaderVar["UMatNormal"], false, new Float32Array(GLMathLib.flatten(MatNormal)));

    // Render.
    gl.drawElements(gl.TRIANGLES, Sphere.indices.length, gl.UNSIGNED_SHORT, 0);

    // Angle
    angle += 1.0;

    // Call render again because we are looping it.
    window.requestAnimFrame(render, canvas);
}

// Load it all!
window.onload = function load() {
    // Initialize the WebGL canvas.
    init();

    // Render the WebGL canvas.
    render();
};

////////////////////////////////////////////////////////////////
// Helper functions.
////////////////////////////////////////////////////////////////

// Initialize separate settings for the canvas.
function setCanvas() {
    var innerAspectRatio = window.innerWidth / window.innerHeight;
    var canvasWidth, canvasHeight;
    if (innerAspectRatio > Settings.aspectRatio) {
        canvasHeight = window.innerHeight;
        canvasWidth = canvasHeight * Settings.aspectRatio;
    } else {
        canvasWidth = window.innerWidth;
        canvasHeight = canvasWidth * 1.0 / Settings.aspectRatio;
    }
    canvas.setAttribute("width", String(canvasWidth));
    canvas.setAttribute("height", String(canvasHeight));
}

// Create and initialize shaders.
function initShaders() {
    // Get the shaders from the DOM/HTML.
    function getShader(gl, id) {
        // Get the shader source.
        var shaderScript = document.getElementById(id);
        if (!shaderScript) {
            return null;
        }
        var sourceCode = '';
        for (var currentChild = shaderScript.firstChild; currentChild; currentChild = currentChild.nextSibling) {
            if (currentChild.nodeType == currentChild.TEXT_NODE) {
                sourceCode += currentChild.textContent;
            }
        }

        // Create the shader and attach the source to it.
        var shader;
        if (shaderScript.type == "x-shader/x-vertex") {
            shader = gl.createShader(gl.VERTEX_SHADER);
        } else if (shaderScript.type == "x-shader/x-fragment") {
            shader = gl.createShader(gl.FRAGMENT_SHADER);
        } else {
            return null;    // Unknown shader type.
        }
        gl.shaderSource(shader, sourceCode);

        // Compile the shader program and check for success.
        gl.compileShader(shader);  
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {  
            console.log("Shader Compilation Error: " + gl.getShaderInfoLog(shader));  
            return null;  
        }

        return shader;
    }

    // Get the shaders from the DOM/HTML.
    var vertexShader = getShader(gl, "vertex-shader");
    var fragmentShader = getShader(gl, "fragment-shader");

    // Create the shader and check if successful.
    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.log("Unable to initialize the shader program!");
    }

    // Activate the shader.
    gl.useProgram(shaderProgram);
}

// Initialize the shader locations.
function initShaderVar() {
    // Attribute variables.
    shaderVar["AVertexPosition"] = gl.getAttribLocation(shaderProgram, "AVertexPosition");
    shaderVar["AVertexNormal"] = gl.getAttribLocation(shaderProgram, "AVertexNormal");
    shaderVar["ATextureCoord"] = gl.getAttribLocation(shaderProgram, "ATextureCoord");

    // Uniform variables.
    shaderVar["USkybox"] = gl.getUniformLocation(shaderProgram, "USkybox");
    shaderVar["UEnvMap"] = gl.getUniformLocation(shaderProgram, "UEnvMap");
    shaderVar["ULightPosition"] = gl.getUniformLocation(shaderProgram, "ULightPosition");
    shaderVar["UCamPosition"] = gl.getUniformLocation(shaderProgram, "UCamPosition");
    shaderVar["UCamPosSky"] = gl.getUniformLocation(shaderProgram, "UCamPosSky");

    shaderVar["UAmbientProduct"] = gl.getUniformLocation(shaderProgram, "UAmbientProduct");
    shaderVar["UDiffuseProduct"] = gl.getUniformLocation(shaderProgram, "UDiffuseProduct");
    shaderVar["USpecularProduct"] = gl.getUniformLocation(shaderProgram, "USpecularProduct");

    shaderVar["USamplerCube"] = gl.getUniformLocation(shaderProgram, "USamplerCube");

    shaderVar["UMatModel"] = gl.getUniformLocation(shaderProgram, "UMatModel");
    shaderVar["UMatView"] = gl.getUniformLocation(shaderProgram, "UMatView");
    shaderVar["UMatViewInv"] = gl.getUniformLocation(shaderProgram, "UMatViewInv");
    shaderVar["UMatProj"] = gl.getUniformLocation(shaderProgram, "UMatProj");
    shaderVar["UMatNormal"] = gl.getUniformLocation(shaderProgram, "UMatNormal");
    shaderVar["UMatCameraRot"] = gl.getUniformLocation(shaderProgram, "UMatCameraRot");
}

function createMeshBuffer(vertices, normals, indices) {
    var result = {};

    // Create vertices buffer.
    result.vertices = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, result.vertices);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    // Create vertex indices buffer.
    result.indices = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, result.indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // Create normals buffer, if applicable.
    if (normals != null) {
        result.normals = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, result.normals);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    }

    return result;
}

// Initialize Buffers.
function initBuffers() {
    // Create buffers for the skybox.
    Buffer.skybox = createMeshBuffer(Skybox.vertices, null, Skybox.indices);

    // Create buffers for the cube.
    Buffer.cube = createMeshBuffer(Cube.vertices, Cube.normals, Cube.indices);

    // Create buffers for the sphere.
    Buffer.sphere = createMeshBuffer(Sphere.vertices, Sphere.normals, Sphere.indices);

    Buffer.mesh = createMeshBuffer(meshRender.vertices, meshRender.normals, meshRender.indices);
}

//
// Initialize the cube map. Code inspiration from
// http://hristo.oskov.com/projects/cs418/mp3/js/mp3.js and, in
// a way, three.js's implementation a skybox.
//
function initSkybox(string) {
    gl.activeTexture(gl.TEXTURE0);

    Skybox.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, Skybox.texture);

    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    var cubeFaces = [
        ["assets/skybox/" + string + "/posx.jpg", gl.TEXTURE_CUBE_MAP_POSITIVE_X],
        ["assets/skybox/" + string + "/negx.jpg", gl.TEXTURE_CUBE_MAP_NEGATIVE_X],
        ["assets/skybox/" + string + "/posy.jpg", gl.TEXTURE_CUBE_MAP_POSITIVE_Y],
        ["assets/skybox/" + string + "/negy.jpg", gl.TEXTURE_CUBE_MAP_NEGATIVE_Y],
        ["assets/skybox/" + string + "/posz.jpg", gl.TEXTURE_CUBE_MAP_POSITIVE_Z],
        ["assets/skybox/" + string + "/negz.jpg", gl.TEXTURE_CUBE_MAP_NEGATIVE_Z]
    ];

    for (var i = 0; i < cubeFaces.length; i++) {
        var image = new Image();
        image.onload = function(texture, face, image) {
            return function() {
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture)
                gl.texImage2D(face, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
            }
        } (Skybox.texture, cubeFaces[i][1], image);
        image.src = cubeFaces[i][0];
    }
}

// Draw texture test.
// function createTexture(img) {
//     var result = gl.createTexture();
//     gl.activeTexture(gl.TEXTURE0);
//     gl.uniform1i(shaderVar["USampler"], 0);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    
//     var image = new Image();
//     image.onload = function(texture, image) {
//         return function() {
//             gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
//             gl.bindTexture(gl.TEXTURE_2D, texture);
//             gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
//             gl.generateMipmap(gl.TEXTURE_2D);
//             gl.bindTexture(gl.TEXTURE_2D, null);
//         }
//     } (result, image);
//     image.src = img;
//     return result;
// }
