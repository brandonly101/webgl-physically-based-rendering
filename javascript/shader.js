// Copyright Brandon Ly 2015-2018 all rights reserved.

// Shader program object encapsulation

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
                    gl.uniformMatrix4fv(uniformVar.glLocation, false, uniformVar.value);
                    break;
                }
            }
        }
    }
}
