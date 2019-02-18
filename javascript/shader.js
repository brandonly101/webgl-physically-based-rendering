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
                case "int":
                    gl.uniform1i(uniformVar.glLocation, uniformVar.value);
                    break;
                case "float":
                    gl.uniform1f(uniformVar.glLocation, uniformVar.value);
                    break;
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
        this.shaderProgramObjectSkybox = new ShaderProgramObject(gl, "glsl/SkyboxVert.glsl", "glsl/SkyboxFrag.glsl",
        { "AVertexPosition" : "vec3" },
        {
            // Vertex Uniforms
            "UMatMVP" : "mat4",
            // Fragment Uniforms
            "UTexCubeEnv" : "samplerCube"
        });
        this.shaderProgramObjectIrradiance = new ShaderProgramObject(gl, "glsl/IrradianceVert.glsl", "glsl/IrradianceFrag.glsl",
        { "AVertexPosition" : "vec3" },
        {
            // Vertex Uniforms
            "UMatMVP" : "mat4",
            // Fragment Uniforms
            "UTexCubeEnv" : "samplerCube"
        });
        this.shaderProgramObjectIBL = new ShaderProgramObject(gl, "glsl/IBLVert.glsl", "glsl/IBLFrag.glsl",
        { "AVertexPosition" : "vec3" },
        {
            // Vertex Uniforms
            "UMatMVP" : "mat4",
            // Fragment Uniforms
            "URoughness" : "float",
            "UIntegrateSpecBRDF" : "int",
            "UTexCubeEnv" : "samplerCube"
        });
        this.shaderProgramObject = this.shaderProgramObjectSkybox;

        gl.useProgram(this.shaderProgramObject.glShaderProgram);

        // Create a WebGL texture object for the environment cubemap
        this.skyboxTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.skyboxTexture);

        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        for (let i = 0; i < 6; i++)
        {
            gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        }

        // Create a WebGL texture object for the diffuse irradiance cubemap
        this.irradianceTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + 1);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.irradianceTexture);

        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        // Set the diffuse irradiance cubemap textures. Once the cubemap is fully-loaded,
        // we will render filtered views of the skybox to the textures.
        for (let i = 0; i < 6; i++)
        {
            gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, gl.RGBA, 64, 64, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        }

        // Create a WebGL texture object for the IBL prefiltered environment map.
        this.specIBLEnvMapTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + 2);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.specIBLEnvMapTexture);

        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // Set the IBL environment map textures. Once the cubemap is fully-loaded,
        // we will render filtered views of the skybox to the textures.
        //
        // Calculate the maximum env map side size, then create the 64 x 64 textures.
        //
        for (let i = 0; i < 6; i++)
        {
            gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, gl.RGBA, 64, 64, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        }

        // Create a WebGL texture object for the 2D environment BRDF lookup.
        this.envBRDFLookup = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + 3);
        gl.bindTexture(gl.TEXTURE_2D, this.envBRDFLookup);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 512, 512, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        this.mipLevels = 0;
        this.mipLevelsMin = 0;
        this.numLoadedFaces = 0;
    }

    setSkyboxTexture(src, mipLevels, mipLevelsMin, loadedFacesCallback = null)
    {
        this.mipLevels = mipLevels;
        this.mipLevelsMin = mipLevelsMin;
        this.numLoadedFaces = 0;

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

        // Set the environment cubemap textures

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.skyboxTexture);

        const mat = this;
        for (let i = 0; i < cubeFaces.length; i++)
        {
            gl.texImage2D(cubeFaces[i][1], 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

            let image = FileUtil.LoadImage(cubeFaces[i][0], () =>
            {
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.skyboxTexture);
                gl.texImage2D(cubeFaces[i][1], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                mat.numLoadedFaces++;
                if (mat.numLoadedFaces == 6 && loadedFacesCallback != null)
                {
                    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
                    loadedFacesCallback();
                }
            });
        }

        // Set the IBL environment map textures. Once the cubemap is fully-loaded,
        // we will render filtered views of the skybox to the textures.
        //
        // Calculate the maximum env map side size, then create the texWidth x texWidth
        // textures with the specified size.
        //
        gl.activeTexture(gl.TEXTURE0 + 2);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.specIBLEnvMapTexture);
        const texWidth = Math.pow(2, this.mipLevels - 1);
        for (let i = 0; i < 6; i++)
        {
            gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, gl.RGBA, texWidth, texWidth, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        }
        gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    }

    setActiveTextures()
    {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.skyboxTexture);

        const uniforms = this.shaderProgramObject.uniforms;

        // Cheeky hack; reserve TEXTURE0 for the environment map texture, not just for the
        // skybox rendering but for all other shader objects as well.
        gl.uniform1i(uniforms["UTexCubeEnv"].glLocation, 0);
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
                "UTexCubeEnv" : "samplerCube",
                "UTexCubeIrradiance" : "samplerCube",
                "UTexCubeSpecIBL" : "samplerCube",
                "UTextureEnvBRDF" : "sampler2D",
                "UMatViewInv" : "mat4",
                "UMatCameraRot" : "mat4",
                "UEnvMipLevels" : "float",
                "UEnvMipLevelsMin" : "float",

                // PBR-specific Uniforms
                "UTextureBaseColor" : "sampler2D",
                "UTextureNormal" : "sampler2D",
                "UTextureMetallic" : "sampler2D",
                "UTextureRoughness" : "sampler2D"
            }
        );

        gl.useProgram(this.shaderProgramObject.glShaderProgram);

        this.baseColorTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + 4);
        gl.bindTexture(gl.TEXTURE_2D, this.baseColorTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));

        this.normalTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + 5);
        gl.bindTexture(gl.TEXTURE_2D, this.normalTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));

        this.metallicTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + 6);
        gl.bindTexture(gl.TEXTURE_2D, this.metallicTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));

        this.roughnessTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + 7);
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

    setBaseColorTexture(srcImage) { this.setTextureImage(srcImage, this.baseColorTexture, 4); }
    setNormalTexture(srcImage) { this.setTextureImage(srcImage, this.normalTexture, 5); }
    setMetallicTexture(srcImage) { this.setTextureImage(srcImage, this.metallicTexture, 6); }
    setRoughnessTexture(srcImage) { this.setTextureImage(srcImage, this.roughnessTexture, 7); }

    setActiveTextures()
    {
        const uniforms = this.shaderProgramObject.uniforms;

        // Cheeky hack; reserve TEXTURE0 for the environment map texture (hence why
        // albedo textures start at unit 1 rather than 0).
        gl.uniform1i(uniforms["UTexCubeEnv"].glLocation, 0);
        gl.uniform1i(uniforms["UTexCubeIrradiance"].glLocation, 1);
        gl.uniform1i(uniforms["UTexCubeSpecIBL"].glLocation, 2);
        gl.uniform1i(uniforms["UTextureEnvBRDF"].glLocation, 3);

        gl.activeTexture(gl.TEXTURE0 + 4);
        gl.bindTexture(gl.TEXTURE_2D, this.baseColorTexture);
        gl.uniform1i(uniforms["UTextureBaseColor"].glLocation, 4);

        gl.activeTexture(gl.TEXTURE0 + 5);
        gl.bindTexture(gl.TEXTURE_2D, this.normalTexture);
        gl.uniform1i(uniforms["UTextureNormal"].glLocation, 5);

        gl.activeTexture(gl.TEXTURE0 + 6);
        gl.bindTexture(gl.TEXTURE_2D, this.metallicTexture);
        gl.uniform1i(uniforms["UTextureMetallic"].glLocation, 6);

        gl.activeTexture(gl.TEXTURE0 + 7);
        gl.bindTexture(gl.TEXTURE_2D, this.roughnessTexture);
        gl.uniform1i(uniforms["UTextureRoughness"].glLocation, 7);
    }
}
