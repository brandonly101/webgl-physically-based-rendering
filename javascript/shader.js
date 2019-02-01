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
                case "vec3":
                    gl.uniform3fv(uniformVar.glLocation, new Float32Array(uniformVar.value));
                    break;
                case "mat4":
                    gl.uniformMatrix4fv(uniformVar.glLocation, false, new Float32Array(uniformVar.value));
                    break;
                }
            }
        }
    }
}

class MaterialSkybox
{
    constructor(gl)
    {
        this.gl = gl;
        this.shaderProgramObject = new ShaderProgramObject(gl, "glsl/SkyboxVert.glsl", "glsl/SkyboxFrag.glsl",
        {
            "AVertexPosition" : "vec3"
        },
        {
            // Vertex Uniforms
            "UMatMVP" : "mat4",
            // Fragment Uniforms
            "USamplerCube" : "samplerCube"
        });

        gl.useProgram(this.shaderProgramObject.glShaderProgram);

        this.attributes = this.shaderProgramObject.attributes;
        this.uniforms = this.shaderProgramObject.uniforms;

        this.skyboxTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.skyboxTexture);

        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }

    setSkyboxTexture(src)
    {
        const gl = this.gl;
        const cubeFaces =
        [
            ["assets/skybox/" + src + "/posx.jpg", gl.TEXTURE_CUBE_MAP_POSITIVE_X],
            ["assets/skybox/" + src + "/negx.jpg", gl.TEXTURE_CUBE_MAP_NEGATIVE_X],
            ["assets/skybox/" + src + "/posy.jpg", gl.TEXTURE_CUBE_MAP_POSITIVE_Y],
            ["assets/skybox/" + src + "/negy.jpg", gl.TEXTURE_CUBE_MAP_NEGATIVE_Y],
            ["assets/skybox/" + src + "/posz.jpg", gl.TEXTURE_CUBE_MAP_POSITIVE_Z],
            ["assets/skybox/" + src + "/negz.jpg", gl.TEXTURE_CUBE_MAP_NEGATIVE_Z]
        ];

        for (let i = 0; i < cubeFaces.length; i++)
        {
            gl.texImage2D(cubeFaces[i][1], 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));

            let image = FileUtil.LoadImage(cubeFaces[i][0], () =>
            {
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.skyboxTexture);
                gl.texImage2D(cubeFaces[i][1], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            });
        }
    }

    setActiveTextures()
    {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.skyboxTexture);

        // Cheeky hack; reserve TEXTURE0 for the environment map texture, not just for the
        // skybox rendering but for all other shader objects as well.
        gl.uniform1i(this.uniforms["USamplerCube"].glLocation, 0);
    }
}

class MaterialPBR
{
    constructor(gl)
    {
        this.gl = gl;
        this.shaderProgramObject = new ShaderProgramObject(
            gl,
            "glsl/PBRVert.glsl",
            "glsl/PBRFrag.glsl",
            {
                "AVertexPosition" : "vec3",
                "AVertexTexCoord" : "vec2",
                "AVertexNormal" : "vec3",
                "AVertexTangent" : "vec4"
            },
            {
                // Vertex Uniforms
                "UCamPosition" : "vec4",
                "UCamPosSky" : "vec4",
                "ULightPosition" : "vec4",
                "ULightDirectDir" : "vec3",
                "UMatModel" : "mat4",
                "UMatView" : "mat4",
                "UMatMV" : "mat4",
                "UMatProj" : "mat4",
                "UMatMVP" : "mat4",
                "UMatNormal" : "mat4",

                // Fragment Uniforms
                "USamplerCube" : "samplerCube",
                "UMatViewInv" : "mat4",
                "UMatCameraRot" : "mat4",

                // PBR-specific Uniforms
                "UTextureAlbedo" : "sampler2D",
                "UTextureNormal" : "sampler2D",
                "UTextureMetallic" : "sampler2D",
                "UTextureRoughness" : "sampler2D"
            }
        );

        gl.useProgram(this.shaderProgramObject.glShaderProgram);

        this.attributes = this.shaderProgramObject.attributes;
        this.uniforms = this.shaderProgramObject.uniforms;

        this.albedoTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + 1);
        gl.bindTexture(gl.TEXTURE_2D, this.albedoTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));

        this.normalTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + 2);
        gl.bindTexture(gl.TEXTURE_2D, this.normalTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));

        this.metallicTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + 3);
        gl.bindTexture(gl.TEXTURE_2D, this.metallicTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));

        this.roughnessTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + 3);
        gl.bindTexture(gl.TEXTURE_2D, this.roughnessTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    }

    setTextureImage(srcImage, texture, unitToActivate)
    {
        const gl = this.gl;

        let image = FileUtil.LoadImage(srcImage, () =>
        {
            gl.activeTexture(gl.TEXTURE0 + unitToActivate);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

            // WebGL1 has different requirements for power of 2 images
            // vs non power of 2 images so check if the image is a
            // power of 2 in both dimensions.
            if (GLMathLib.isPowerOf2(image.width) && GLMathLib.isPowerOf2(image.height))
            {
                // Yes, it's a power of 2. Generate mips.
                gl.generateMipmap(gl.TEXTURE_2D);
            }
            else
            {
                // No, it's not a power of 2. Turn off mips and set wrapping to clamp to edge
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            }
        });
    }

    setAlbedoTexture(srcImage) { this.setTextureImage(srcImage, this.albedoTexture, 1); }
    setNormalTexture(srcImage) { this.setTextureImage(srcImage, this.normalTexture, 2); }
    setMetallicTexture(srcImage) { this.setTextureImage(srcImage, this.metallicTexture, 3); }
    setRoughnessTexture(srcImage) { this.setTextureImage(srcImage, this.roughnessTexture, 4); }

    setActiveTextures()
    {
        // Cheeky hack; reserve TEXTURE0 for the environment map texture (hence why
        // albedo textures start at unit 1 rather than 0).
        gl.uniform1i(this.uniforms["USamplerCube"].glLocation, 0);

        gl.activeTexture(gl.TEXTURE0 + 1);
        gl.bindTexture(gl.TEXTURE_2D, this.albedoTexture);
        gl.uniform1i(this.uniforms["UTextureAlbedo"].glLocation, 1);

        gl.activeTexture(gl.TEXTURE0 + 2);
        gl.bindTexture(gl.TEXTURE_2D, this.normalTexture);
        gl.uniform1i(this.uniforms["UTextureNormal"].glLocation, 2);

        gl.activeTexture(gl.TEXTURE0 + 3);
        gl.bindTexture(gl.TEXTURE_2D, this.metallicTexture);
        gl.uniform1i(this.uniforms["UTextureMetallic"].glLocation, 3);
        
        gl.activeTexture(gl.TEXTURE0 + 4);
        gl.bindTexture(gl.TEXTURE_2D, this.roughnessTexture);
        gl.uniform1i(this.uniforms["UTextureRoughness"].glLocation, 4);
    }
}
