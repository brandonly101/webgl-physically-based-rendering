// Copyright Brandon Ly 2015 all rights reserved.

// WebGL Code to also learn about implementing physically based rendering.

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
var Buffer = new function(){};
Buffer.cube = {};
Buffer.sphere = {};

// Vertex Class
var Vertex = new function(){};

// Vertex coordinates.
Vertex.cube = {};
Vertex.cube.vertices = [
    // Front face
    -1.0, -1.0,  1.0,
    1.0, -1.0,  1.0,
    1.0,  1.0,  1.0,
    -1.0,  1.0,  1.0,

    // Back face
    -1.0, -1.0, -1.0,
    -1.0,  1.0, -1.0,
    1.0,  1.0, -1.0,
    1.0, -1.0, -1.0,

    // Top face
    -1.0,  1.0, -1.0,
    -1.0,  1.0,  1.0,
    1.0,  1.0,  1.0,
    1.0,  1.0, -1.0,

    // Bottom face
    -1.0, -1.0, -1.0,
    1.0, -1.0, -1.0,
    1.0, -1.0,  1.0,
    -1.0, -1.0,  1.0,

    // Right face
    1.0, -1.0, -1.0,
    1.0,  1.0, -1.0,
    1.0,  1.0,  1.0,
    1.0, -1.0,  1.0,

    // Left face
    -1.0, -1.0, -1.0,
    -1.0, -1.0,  1.0,
    -1.0,  1.0,  1.0,
    -1.0,  1.0, -1.0
];
Vertex.cube.normals = [
    // Front face
    0.0, 0.0, 1.0,
    0.0, 0.0, 1.0,
    0.0, 0.0, 1.0,
    0.0, 0.0, 1.0,

    // Back Face
    0.0, 0.0, -1.0,
    0.0, 0.0, -1.0,
    0.0, 0.0, -1.0,
    0.0, 0.0, -1.0,

    // Top Face
    0.0, 1.0, 0.0,
    0.0, 1.0, 0.0,
    0.0, 1.0, 0.0,
    0.0, 1.0, 0.0,

    // Bottom face
    0.0, -1.0, 0.0,
    0.0, -1.0, 0.0,
    0.0, -1.0, 0.0,
    0.0, -1.0, 0.0,

    // Right face
    1.0, 0.0, 0.0,
    1.0, 0.0, 0.0,
    1.0, 0.0, 0.0,
    1.0, 0.0, 0.0,

    // Left face
    -1.0, 0.0, 0.0,
    -1.0, 0.0, 0.0,
    -1.0, 0.0, 0.0,
    -1.0, 0.0, 0.0,
];

Vertex.cube.indices = [
    0,  1,  2,      0,  2,  3,    // front
    4,  5,  6,      4,  6,  7,    // back
    8,  9,  10,     8,  10, 11,   // top
    12, 13, 14,     12, 14, 15,   // bottom
    16, 17, 18,     16, 18, 19,   // right
    20, 21, 22,     20, 22, 23    // left
];

// Vertex Coordinates for Sphere (or tetrahedron)
Vertex.sphere = {}
Vertex.sphere.vertices = [];
Vertex.sphere.normals = [];
Vertex.sphere.indices = [];

function tetrahedron(a, b, c, d, n) {
    function triangle(a, b, c) {
        // Vertices
        Vertex.sphere.indices.push(Vertex.sphere.vertices.length/3);
        Vertex.sphere.vertices = Vertex.sphere.vertices.concat(a);
        Vertex.sphere.indices.push(Vertex.sphere.vertices.length/3);
        Vertex.sphere.vertices = Vertex.sphere.vertices.concat(b);
        Vertex.sphere.indices.push(Vertex.sphere.vertices.length/3);
        Vertex.sphere.vertices = Vertex.sphere.vertices.concat(c);

        // Normals
        Vertex.sphere.normals = Vertex.sphere.normals.concat(a);
        Vertex.sphere.normals = Vertex.sphere.normals.concat(b);
        Vertex.sphere.normals = Vertex.sphere.normals.concat(c);
    }
    function divideTriangle(a, b, c, count) {
        if (count > 0) {
            var ab = GLMathLib.normalize(GLMathLib.mid(a, b));
            var ac = GLMathLib.normalize(GLMathLib.mid(a, c));
            var bc = GLMathLib.normalize(GLMathLib.mid(b, c));
            divideTriangle(a, ab, ac, count - 1);
            divideTriangle(ab, b, bc, count - 1);
            divideTriangle(bc, c, ac, count - 1);
            divideTriangle(ab, bc, ac, count - 1);
        } else {
            triangle (a, b, c);
        }
    }
    divideTriangle(a, b, c, n);
    divideTriangle(d, c, b, n);
    divideTriangle(a, d, b, n);
    divideTriangle(a, c, d, n);
}

var circleSubdivisions = 5;
var va = GLMathLib.vec3(0, 0, -1);
var vb = GLMathLib.vec3(0.0, 0.942809, 0.333333);
var vc = GLMathLib.vec3(-0.816497, -0.471405, 0.333333);
var vd = GLMathLib.vec3(0.816497, -0.471405, 0.333333);

// Lighting and shading properties.
var LightPosition = GLMathLib.vec3(0.0, 3.0, 3.0);

var LightAmbient = GLMathLib.vec4(0.1, 0.1, 0.1, 1.0);
var LightDiffuse = GLMathLib.vec4(1.0, 1.0, 1.0, 1.0);
var LightSpecular = GLMathLib.vec4(1.0, 1.0, 1.0, 1.0);

var MaterialAmbient = GLMathLib.vec4(1.0, 1.0, 1.0, 1.0);
var MaterialDiffuse = GLMathLib.vec4(1.0, 0.8, 0.0, 1.0);
var MaterialSpecular = GLMathLib.vec4(1.0, 1.0, 1.0, 1.0);

var AmbientProduct, DiffuseProduct, SpecularProduct;

// Viewport properties.
var yFOV = 65.0;
var aspectRatio = 16.0/9.0;
var nearClipPlane = 0.3;
var farClipPlane = 1000.0;

var MatModel;
var MatView;
var MatProj;
var MatModelView;

var angle = 0;

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

    // Activate the shader?
    gl.useProgram(shaderProgram);
}

// Initialize the shader locations.
function initShaderVar() {
    // Attribute variables.
    shaderVar["AVertexPosition"] = gl.getAttribLocation(shaderProgram, "AVertexPosition");
    shaderVar["AVertexNormal"] = gl.getAttribLocation(shaderProgram, "AVertexNormal");

    // Uniform variables.
    shaderVar["ULightPosition"] = gl.getUniformLocation(shaderProgram, "ULightPosition");
    shaderVar["UAmbientProduct"] = gl.getUniformLocation(shaderProgram, "UAmbientProduct");
    shaderVar["UDiffuseProduct"] = gl.getUniformLocation(shaderProgram, "UDiffuseProduct");
    shaderVar["USpecularProduct"] = gl.getUniformLocation(shaderProgram, "USpecularProduct");
    shaderVar["UMatModel"] = gl.getUniformLocation(shaderProgram, "UMatModel");
    shaderVar["UMatModelView"] = gl.getUniformLocation(shaderProgram, "UMatModelView");
    shaderVar["UMatProj"] = gl.getUniformLocation(shaderProgram, "UMatProj");
}

// Initialize Buffers.
function initBuffers() {
    // Create buffers for the cube.
    Buffer.cube.vertices = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, Buffer.cube.vertices);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(Vertex.cube.vertices), gl.STATIC_DRAW);
    Buffer.cube.normals = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, Buffer.cube.normals);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(Vertex.cube.normals), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    Buffer.cube.indices = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Buffer.cube.indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(Vertex.cube.indices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // Create buffers for the sphere.
    Buffer.sphere.vertices = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, Buffer.sphere.vertices);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(Vertex.sphere.vertices), gl.STATIC_DRAW);
    Buffer.sphere.normals = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, Buffer.sphere.normals);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(Vertex.sphere.normals), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    Buffer.sphere.indices = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Buffer.sphere.indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(Vertex.sphere.indices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

// Draw the Scene.
function initScene() {
    // Clear the color as well as the depth buffer.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.clearColor(0.15, 0.15, 0.15, 1.0);

    // Create the lighting variables.
    AmbientProduct = GLMathLib.mult(LightAmbient, MaterialAmbient);
    DiffuseProduct = GLMathLib.mult(LightDiffuse, MaterialDiffuse);
    SpecularProduct = GLMathLib.mult(LightSpecular, MaterialSpecular);

    // Pass the lighting variables to the shaders.
    gl.uniform3fv(shaderVar["ULightPosition"], new Float32Array(LightPosition));
    gl.uniform4fv(shaderVar["UAmbientProduct"], new Float32Array(AmbientProduct));
    gl.uniform4fv(shaderVar["UDiffuseProduct"], new Float32Array(DiffuseProduct));
    gl.uniform4fv(shaderVar["USpecularProduct"], new Float32Array(SpecularProduct));

    // Create the transformation matrix.
    MatModel = GLMathLib.mat4(1.0);
    MatView = GLMathLib.lookAt(GLMathLib.vec3(0.0, 0.0, 0.0), GLMathLib.vec3(0.0, 0.0, 7.0), GLMathLib.vec3(0.0, 1.0, 0.0));
    MatProj = GLMathLib.perspective(yFOV, aspectRatio, nearClipPlane, farClipPlane);
    MatModelView = GLMathLib.mult(MatView, MatModel);

    // Pass the transformation matrix components to the shaders.
    gl.uniformMatrix4fv(shaderVar["UMatModel"], false, new Float32Array(GLMathLib.flatten(MatModel)));
    gl.uniformMatrix4fv(shaderVar["UMatModelView"], false, new Float32Array(GLMathLib.flatten(MatModelView)));
    gl.uniformMatrix4fv(shaderVar["UMatProj"], false, new Float32Array(GLMathLib.flatten(MatProj)));
}

// Function for initializing everything.
function init() {
    // Get the context into a local gl and and a public gl.
    // Use preserveDrawingBuffer:true to keep the drawing buffer after
    // presentation. Fail if context is not found.
    try {
        gl = WebGLUtils.setupWebGL(canvas);
    } catch (e) {
        console.log("Getting context failed!");
    }

    // Continue if WebGL works on the browser.
    if (gl) {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);                      // Set the canvas background to pure black.
        gl.enable(gl.DEPTH_TEST);                               // Enable depth testing.
        gl.depthFunc(gl.LEQUAL);                                // Make near things obscure far things.
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);    // Clear the color as well as the depth buffer.
        gl.viewport(0, 0, canvas.width, canvas.height);         // Make the viewport adhere to the canvas size.
    }

    tetrahedron(va, vb, vc, vd, circleSubdivisions);

    // Initialize the shaders.
    initShaders();

    // Initialize the shader variable locations.
    initShaderVar();

    // Initialize the buffers.
    initBuffers();

    // Draw the initial scene.
    initScene();
}

function render() {
    // Clear the color as well as the depth buffer.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Enable pointers.
    gl.enableVertexAttribArray(shaderVar["AVertexPosition"]);
    gl.enableVertexAttribArray(shaderVar["AVertexNormal"]);

    // Draw cube.

    // Rebind buffers.
    gl.bindBuffer(gl.ARRAY_BUFFER, Buffer.cube.vertices);
    gl.vertexAttribPointer(shaderVar["AVertexPosition"], 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, Buffer.cube.normals);
    gl.vertexAttribPointer(shaderVar["AVertexNormal"], 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Buffer.cube.indices);

    // Apply transformations.
    MatModel = GLMathLib.mat4(1.0);
    MatModel = GLMathLib.rotate(MatModel, angle/3, GLMathLib.vec3(1, 0, 0));
    MatModel = GLMathLib.rotate(MatModel, angle/3, GLMathLib.vec3(0, 1, 0));
    MatModel = GLMathLib.translate(MatModel, GLMathLib.vec3(3, 0, 0));
    MatModelView = GLMathLib.mult(MatView, MatModel);
    gl.uniformMatrix4fv(shaderVar["UMatModel"], false, new Float32Array(GLMathLib.flatten(MatModel)));
    gl.uniformMatrix4fv(shaderVar["UMatModelView"], false, new Float32Array(GLMathLib.flatten(MatModelView)));

    gl.drawElements(gl.TRIANGLES, Vertex.cube.indices.length, gl.UNSIGNED_SHORT, 0);
    gl.disableVertexAttribArray;

    // Draw Sphere

    // Rebind Buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, Buffer.sphere.vertices);
    gl.vertexAttribPointer(shaderVar["AVertexPosition"], 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, Buffer.sphere.normals);
    gl.vertexAttribPointer(shaderVar["AVertexNormal"], 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Buffer.sphere.indices);

    MatModel = GLMathLib.mat4(1.0);
    MatModel = GLMathLib.scale(MatModel, GLMathLib.vec3(1.5, 1.5, 1.5));
    MatModel = GLMathLib.rotate(MatModel, angle, GLMathLib.vec3(1, 0, 0));
    MatModel = GLMathLib.rotate(MatModel, angle, GLMathLib.vec3(0, 1, 0));
    MatModel = GLMathLib.translate(MatModel, GLMathLib.vec3(-3, 0, 0));
    MatModel = GLMathLib.translate(MatModel, GLMathLib.vec3(0, Math.sin(angle/60.0)*2, 0));
    MatModelView = GLMathLib.mult(MatView, MatModel);
    gl.uniformMatrix4fv(shaderVar["UMatModel"], false, new Float32Array(GLMathLib.flatten(MatModel)));
    gl.uniformMatrix4fv(shaderVar["UMatModelView"], false, new Float32Array(GLMathLib.flatten(MatModelView)));

    gl.drawElements(gl.TRIANGLES, Vertex.sphere.indices.length, gl.UNSIGNED_SHORT, 0);
    gl.disableVertexAttribArray;

    angle += 1;

    window.requestAnimFrame(render, canvas);
}

// Load it all!
window.onload = function load() {
    // Initialize the WebGL canvas.
    init();

    // Render the WebGL canvas.
    render();
};
