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
var shaderProgramPhong;
var shaderProgramObjectPhong;
var shaderProgramSkybox;
var shaderVarPhong = {};
var shaderVarSkybox = {};
var skyboxImageLoadCount = 0;

// Vertex Buffer variables
var Buffer = Buffer || {};
Buffer.cube = {};
Buffer.sphere = {};
Buffer.skybox = {};
Buffer.mesh = {};

// Create a cube and sphere mesh object
var Cube = Mesh.createCube();
var meshRender = Mesh.createCube();
var Sphere = Mesh.createSphere(4);
var Skybox = Mesh.createCubeMap(500.0);

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

var MatModel, MatView, MatProj, MatModelView, MatMVP;
var MatNormal;

var angle = 0;

class ShaderProgramObject
{
    // Get the shaders GLSL files via XMLHTTPRequest.
    static getShaderFromFile(gl, filename, shaderType)
    {
        // Get the shader source.
        var sourceCode = FileUtil.GetFile(filename);

        // Create the shader and attach the source to it.
        var shader;
        switch (shaderType)
        {
        case "vertex":
            shader = gl.createShader(gl.VERTEX_SHADER);
            break;
        case "fragment":
            shader = gl.createShader(gl.FRAGMENT_SHADER);
            break;
        default:
            return null; // Unknown shader type.
        }
        gl.shaderSource(shader, sourceCode);

        // Compile the shader program and check for success.
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        {
            console.log("Shader Compilation Error: " + gl.getShaderInfoLog(shader));
            return null;
        }

        return shader;
    }

    constructor(gl,
                filenameVertex,
                filenameFragment,
                shaderAttributes,
                shaderUniforms)
    {
        this.gl = gl;

        // Get the shader GLSL files via XMLHTTPRequest.
        let glVertexShader = ShaderProgramObject.getShaderFromFile(gl, filenameVertex, "vertex");
        let glFragmentShader = ShaderProgramObject.getShaderFromFile(gl, filenameFragment, "fragment");

        // Create the shader and check if successful.
        this.glShaderProgram = gl.createProgram();
        gl.attachShader(this.glShaderProgram, glVertexShader);
        gl.attachShader(this.glShaderProgram, glFragmentShader);
        gl.linkProgram(this.glShaderProgram);
        if (!gl.getProgramParameter(this.glShaderProgram, gl.LINK_STATUS))
        {
            console.log("Unable to initialize the shader program!");
        }

        // Set up shader attribute variables.
        this.attributes = {};
        let attributeNames = Object.keys(shaderAttributes);
        for (let i = 0; i < attributeNames.length; i++)
        {
            this.attributes[attributeNames[i]] =
            {
                "glLocation": gl.getAttribLocation(this.glShaderProgram, attributeNames[i]),
                "type": shaderAttributes[attributeNames[i]]
            };
        }
        this.attributesArray = Object.values(this.attributes);

        // Set up shader uniform variables.
        this.uniforms = {};
        let uniformNames = Object.keys(shaderUniforms);
        for (let i = 0; i < uniformNames.length; i++)
        {
            this.uniforms[uniformNames[i]] =
            {
                "glLocation": gl.getUniformLocation(this.glShaderProgram, uniformNames[i]),
                "type": shaderUniforms[uniformNames[i]],
                "value": null
            };
        }
        this.uniformsArray = Object.values(this.uniforms);
    }

    setUniforms()
    {
        let gl = this.gl;

        for (let i = 0; i < this.uniformsArray.length; i++)
        {
            let uniformVar = this.uniformsArray[i];
            if (uniformVar.glLocation != null && uniformVar.value != null)
            {
                switch (uniformVar.type)
                {
                case "vec4":
                    gl.uniform4fv(uniformVar.glLocation, new Float32Array(uniformVar.value));
                    break;
                case "mat4":
                    gl.uniformMatrix4fv(uniformVar.glLocation, false, new Float32Array(uniformVar.value));
                    break;
                }
            }
        }
    }
}

// class Object
// {
//     constructor(gl,
//                 mesh,
//                 attribLocationVertex,
//                 attribLocationNormal)
//     {
//         this.gl = gl;
//         this.mesh = mesh;
//         this.attribLocationVertex;
//         this.attribLocationNormal;
//         this.buffers = {};
//     }

//     init()
//     {
//         let gl = this.gl;

//         // Create vertices buffer.
//         this.buffers.vertices = gl.createBuffer();
//         gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.vertices);
//         gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

//         // Create normals buffer, if applicable.
//         if (this.mesh.normals != null)
//         {
//             this.buffers.normals = gl.createBuffer();
//             gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.normals);
//             gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

//         }

//         // Create vertex indices buffer.
//         this.buffers.indices = gl.createBuffer();
//         gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.indices);
//         gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
//     }

//     render()
//     {
//         let gl = this.gl;

//         // Rebind buffers.
//         gl.bindBuffer(gl.ARRAY_BUFFER, Buffer.mesh.vertices);
//         gl.vertexAttribPointer(this.attribLocationVertex, 3, gl.FLOAT, false, 0, 0);
//         gl.enableVertexAttribArray(this.attribLocationVertex);

//         if (this.mesh.normals != null)
//         {
//             gl.bindBuffer(gl.ARRAY_BUFFER, Buffer.mesh.normals);
//             gl.vertexAttribPointer(this.attribLocationNormal, 3, gl.FLOAT, false, 0, 0);
//             gl.enableVertexAttribArray(this.attribLocationNormal);
//         }
//         gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Buffer.mesh.indices);

//         // draw
//         // ...

//         // Disable attributes
//         gl.disableVertexAttribArray(this.attribLocationVertex);
//         if (this.mesh.normals != null)
//         {
//             gl.disableVertexAttribArray(this.attribLocationNormal);
//         }
//     }
// }

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
    initShaders();

    // Initialize the buffers.
    initBuffers();

    // Initialize the skybox.
    initSkybox("Yokohama3");

    // Initialize some parameters for the scene.

    // Clear the color as well as the depth buffer.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // gl.clearColor(0.15, 0.15, 0.15, 1.0);

    // Create the transformation matrix and calculate other matrices.
    MatModel = GLMathLib.mat4(1.0);
    MatView = GLMathLib.lookAt(Camera.at, Camera.eye, Camera.up);
    MatProj = GLMathLib.perspective(Settings.yFOV, Settings.aspectRatio, Settings.nearClipPlane, Settings.farClipPlane);
    MatModelView = GLMathLib.mult(MatView, MatModel);
    MatNormal = GLMathLib.transpose(GLMathLib.inverse(MatModelView));

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Phong Shader

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

    if (true)
    {
        // Activate the shader.
        gl.useProgram(shaderProgramObjectPhong.glShaderProgram);

        // Pass some position variables to the shaders.
        shaderProgramObjectPhong.uniforms["UCamPosition"].value = GLMathLib.vec4(Camera.eye, 0.0);
        shaderProgramObjectPhong.uniforms["UCamPosSky"].value = GLMathLib.vec4(Camera.eye, 0.0);

        // Pass the transformation matrix components to the shaders.
        shaderProgramObjectPhong.uniforms["UMatModel"].value = GLMathLib.flatten(MatModel);
        shaderProgramObjectPhong.uniforms["UMatNormal"].value = GLMathLib.flatten(MatNormal);

        // Create the lighting variables.
        AmbientProduct = GLMathLib.mult(LightAmbient, MaterialAmbient);
        DiffuseProduct = GLMathLib.mult(LightDiffuse, MaterialDiffuse);
        SpecularProduct = GLMathLib.mult(LightSpecular, MaterialSpecular);

        // Pass the lighting variables to the shaders.
        shaderProgramObjectPhong.uniforms["UAmbientProduct"].value = AmbientProduct;
        shaderProgramObjectPhong.uniforms["UDiffuseProduct"].value = DiffuseProduct;
        shaderProgramObjectPhong.uniforms["USpecularProduct"].value = SpecularProduct;
    }

    ////////////////////////////////////////////////////////////////////////////////
    // Skybox Shader

    // Activate the shader.
    gl.useProgram(shaderProgramSkybox);

    MatMVP = GLMathLib.mult(MatProj, MatModelView);
    // gl.enableVertexAttribArray(shaderVarSkybox["AVertexPosition"]);

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
    var MatCameraRotInv = GLMathLib.inverse(MatCameraRot);

    ////////////////////////////
    // Draw skybox.
    if (skyboxImageLoadCount === 6)
    {
        // Activate the shader.
        gl.useProgram(shaderProgramSkybox);

        // Rebind buffers.
        gl.bindBuffer(gl.ARRAY_BUFFER, Buffer.skybox.vertices);
        gl.vertexAttribPointer(shaderVarSkybox["AVertexPosition"], 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shaderVarSkybox["AVertexPosition"]);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Buffer.skybox.indices);

        // Apply transformations.
        var MatSkybox = GLMathLib.mat4(1.0);
        MatSkybox = GLMathLib.mult(MatCameraRotInv, MatSkybox);
        MatSkybox = GLMathLib.mult(MatModel, MatSkybox);
        MatSkybox = GLMathLib.mult(MatView, MatSkybox);
        MatSkybox = GLMathLib.mult(MatProj, MatSkybox);

        // Update specific uniforms.
        gl.uniformMatrix4fv(shaderVarSkybox["UMatMVP"], false, new Float32Array(GLMathLib.flatten(MatSkybox)));
        // gl.uniform1i(shaderVarSkybox["USamplerCube"], 0);

        // Render.
        gl.drawElements(gl.TRIANGLES, Skybox.indices.length, gl.UNSIGNED_SHORT, 0);
    }

    ////////////////////////////
    // Draw general meshes.
    if (skyboxImageLoadCount === 6)
    {
        // Activate the shader.
        gl.useProgram(shaderProgramObjectPhong.glShaderProgram);

        // Update general uniforms.
        var NewCameraPosition = GLMathLib.mult(MatCameraRotInv, GLMathLib.vec4(Camera.eye, 1.0));
        shaderProgramObjectPhong.uniforms["UCamPosition"].value = NewCameraPosition;
        shaderProgramObjectPhong.uniforms["UMatViewInv"].value = GLMathLib.flatten(GLMathLib.inverse(MatView));
        var NewLightPosition = GLMathLib.mult(MatCameraRotInv, LightPosition);
        shaderProgramObjectPhong.uniforms["ULightPosition"].value = NewLightPosition;
        shaderProgramObjectPhong.uniforms["UMatCameraRot"].value = GLMathLib.flatten(MatCameraRot);

        // Draw cube.

        // Rebind buffers.
        gl.bindBuffer(gl.ARRAY_BUFFER, Buffer.cube.vertices);
        gl.vertexAttribPointer(shaderProgramObjectPhong.attributes["AVertexPosition"].glLocation, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shaderProgramObjectPhong.attributes["AVertexPosition"].glLocation);

        gl.bindBuffer(gl.ARRAY_BUFFER, Buffer.cube.normals);
        gl.vertexAttribPointer(shaderProgramObjectPhong.attributes["AVertexNormal"].glLocation, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shaderProgramObjectPhong.attributes["AVertexNormal"].glLocation);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Buffer.cube.indices);
        // gl.bindTexture(gl.TEXTURE_CUBE_MAP, Skybox.texture);

        // Apply transformations.
        var MatCube = GLMathLib.mat4(1.0);
        MatCube = GLMathLib.scale(MatCube, GLMathLib.vec3(1.3, 1.3, 1.3));
        MatCube = GLMathLib.rotate(MatCube, angle/3, GLMathLib.vec3(1, 0, 0));
        MatCube = GLMathLib.rotate(MatCube, angle/3, GLMathLib.vec3(0, 1, 0));
        MatCube = GLMathLib.translate(MatCube, GLMathLib.vec3(3, 0, 0));

        // Camera Rotation Matrix
        MatCube = GLMathLib.mult(MatCameraRotInv, MatCube);
        MatNormal = GLMathLib.transpose(GLMathLib.inverse(MatCube));
        shaderProgramObjectPhong.uniforms["UMatModel"].value = GLMathLib.flatten(MatCube);
        MatCube = GLMathLib.mult(MatView, MatCube);
        MatCube = GLMathLib.mult(MatProj, MatCube);
        shaderProgramObjectPhong.uniforms["UMatMVP"].value = GLMathLib.flatten(MatCube);
        shaderProgramObjectPhong.uniforms["UMatNormal"].value = GLMathLib.flatten(MatNormal);

        shaderProgramObjectPhong.setUniforms();

        // Render.
        gl.drawElements(gl.TRIANGLES, Cube.indices.length, gl.UNSIGNED_SHORT, 0);

        gl.disableVertexAttribArray(shaderProgramObjectPhong.attributes["AVertexPosition"].glLocation);
        gl.disableVertexAttribArray(shaderProgramObjectPhong.attributes["AVertexNormal"].glLocation);

        // // Draw Sphere

        // // Rebind Buffers
        // gl.bindBuffer(gl.ARRAY_BUFFER, Buffer.sphere.vertices);
        // gl.vertexAttribPointer(shaderVarPhong["AVertexPosition"], 3, gl.FLOAT, false, 0, 0);
        // gl.bindBuffer(gl.ARRAY_BUFFER, Buffer.sphere.normals);
        // gl.vertexAttribPointer(shaderVarPhong["AVertexNormal"], 3, gl.FLOAT, false, 0, 0);
        // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Buffer.sphere.indices);
        // gl.bindTexture(gl.TEXTURE_CUBE_MAP, Skybox.texture);

        // var MatSphere = GLMathLib.mat4(1.0);
        // MatSphere = GLMathLib.scale(MatSphere, GLMathLib.vec3(2, 2, 2));
        // MatSphere = GLMathLib.translate(MatSphere, GLMathLib.vec3(-3, 0, 0));
        // // Camera Rotation Matrix
        // MatSphere = GLMathLib.mult(MatCameraRotInv, MatSphere);
        // MatNormal = GLMathLib.transpose(GLMathLib.inverse(MatSphere));
        // gl.uniformMatrix4fv(shaderVarPhong["UMatModel"], false, new Float32Array(GLMathLib.flatten(MatSphere)));
        // MatSphere = GLMathLib.mult(MatView, MatSphere);
        // MatSphere = GLMathLib.mult(MatProj, MatSphere);
        // gl.uniformMatrix4fv(shaderVarPhong["UMatMVP"], false, new Float32Array(GLMathLib.flatten(MatSphere)));
        // gl.uniformMatrix4fv(shaderVarPhong["UMatNormal"], false, new Float32Array(GLMathLib.flatten(MatNormal)));

        // // Render.
        // gl.drawElements(gl.TRIANGLES, Sphere.indices.length, gl.UNSIGNED_SHORT, 0);
    }

    // Angle
    angle += 1.0;

    // Call render again because we are looping it.
    window.requestAnimFrame(render, canvas);
}

// Load it all!
window.onload = function load()
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

// Create and initialize shaders.
function initShaders()
{
    // Get the shaders GLSL files via XMLHTTPRequest.
    function getShaderFromFile(gl, filename, shaderType)
    {
        // Get the shader source.
        var sourceCode = FileUtil.GetFile(filename);

        // Create the shader and attach the source to it.
        var shader;
        switch (shaderType)
        {
        case "vertex":
            shader = gl.createShader(gl.VERTEX_SHADER);
            break;
        case "fragment":
            shader = gl.createShader(gl.FRAGMENT_SHADER);
            break;
        default:
            return null; // Unknown shader type.
        }
        gl.shaderSource(shader, sourceCode);

        // Compile the shader program and check for success.
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        {
            console.log("Shader Compilation Error: " + gl.getShaderInfoLog(shader));
            return null;
        }

        return shader;
    }

    function SetShaderVars(gl, shaderProgram, shaderProgramVars, glVarType, shaderVars)
    {
        if (glVarType == "attribute")
        {
            for (var i = 0; i < shaderVars.length; i++)
            {
                var shaderVar = shaderVars[i];
                shaderProgramVars[shaderVar] = gl.getAttribLocation(shaderProgram, shaderVar);
            }
        }
        else if (glVarType == "uniform")
        {
            for (var i = 0; i < shaderVars.length; i++)
            {
                var shaderVar = shaderVars[i];
                shaderProgramVars[shaderVar] = gl.getUniformLocation(shaderProgram, shaderVar);
            }
        }
    }

    ////////////////////////////////////////////////////////////////////////////////
    // Phong shader

    // // Get the shader GLSL files via XMLHTTPRequest.
    // var vertexShaderPhong = getShaderFromFile(gl, "glsl/vertex.glsl", "vertex");
    // var fragmentShaderPhong = getShaderFromFile(gl, "glsl/fragment.glsl", "fragment");

    // // Create the shader and check if successful.
    // shaderProgramPhong = gl.createProgram();
    // gl.attachShader(shaderProgramPhong, vertexShaderPhong);
    // gl.attachShader(shaderProgramPhong, fragmentShaderPhong);
    // gl.linkProgram(shaderProgramPhong);
    // if (!gl.getProgramParameter(shaderProgramPhong, gl.LINK_STATUS))
    // {
    //     console.log("Unable to initialize the shader program!");
    // }

    // Attribute variables.
    // SetShaderVars(gl, shaderProgramPhong, shaderVarPhong, "attribute",
    // [
    //     "AVertexPosition",
    //     "AVertexNormal",
    //     "ATextureCoord"
    // ]);

    // // Uniform variables.
    // SetShaderVars(gl, shaderProgramPhong, shaderVarPhong, "uniform",
    // [
    //     "USkybox",
    //     "UEnvMap",
    //     "ULightPosition",
    //     "UCamPosition",
    //     "UCamPosSky",
    //     "UAmbientProduct",
    //     "UDiffuseProduct",
    //     "USpecularProduct",
    //     "USamplerCube",
    //     "UMatModel",
    //     "UMatMVP",
    //     "UMatNormal",
    //     "UMatViewInv",
    //     "UMatCameraRot"
    // ]);

    ////////////////////////////////////////////////////////////////////////////////
    // Skybox Shader

    // Get the shader GLSL files via XMLHTTPRequest.
    var vertexShaderSkybox = getShaderFromFile(gl, "glsl/SkyboxVert.glsl", "vertex");
    var fragmentShaderSkybox = getShaderFromFile(gl, "glsl/SkyboxFrag.glsl", "fragment");

    // Create the shader and check if successful.
    shaderProgramSkybox = gl.createProgram();
    gl.attachShader(shaderProgramSkybox, vertexShaderSkybox);
    gl.attachShader(shaderProgramSkybox, fragmentShaderSkybox);
    gl.linkProgram(shaderProgramSkybox);
    if (!gl.getProgramParameter(shaderProgramSkybox, gl.LINK_STATUS))
    {
        console.log("Unable to initialize the shader program!");
    }

    // Set shader variables

    // Attribute variables.
    SetShaderVars(gl, shaderProgramSkybox, shaderVarSkybox, "attribute", [ "AVertexPosition" ]);

    // Uniform variables.
    SetShaderVars(gl, shaderProgramSkybox, shaderVarSkybox, "uniform", [ "UMatMVP", "USamplerCube" ]);
}

function createMeshBuffer(vertices, normals, indices)
{
    var result = {};

    // Create vertices buffer.
    result.vertices = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, result.vertices);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    // Create normals buffer, if applicable.
    if (normals != null)
    {
        result.normals = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, result.normals);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    }

    // Create vertex indices buffer.
    result.indices = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, result.indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return result;
}

// Initialize Buffers.
function initBuffers()
{
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

    var cubeFaces = [
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
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture)
                gl.texImage2D(face, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                // gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
                skyboxImageLoadCount++;
            }
        } (Skybox.texture, cubeFaces[i][1], image);
        image.src = cubeFaces[i][0];
    }
}
