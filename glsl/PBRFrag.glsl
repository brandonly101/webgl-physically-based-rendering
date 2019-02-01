// Copyright 2015 Brandon Ly all rights reserved.
//
// Fragment shader.
//
precision highp float;

// Uniforms
uniform mat4 UMatModel;
uniform mat4 UMatView;
uniform mat4 UMatMV;
uniform mat4 UMatNormal;

uniform samplerCube USamplerCube;

uniform sampler2D UTextureBaseColor;
uniform sampler2D UTextureNormal;
uniform sampler2D UTextureMetallic;
uniform sampler2D UTextureRoughness;

// Variables passed from vert to pixel
varying vec3 VEnvMapI;
varying vec3 VEnvMapN;

varying vec3 VTextureCoordSkybox;
varying vec2 VVertexTexCoord;

varying vec3 VTanLightDir;
varying vec3 VTanViewDir;

highp vec4 gammaDecode(vec4 encoded)
{
    return pow(encoded, vec4(2.2));
}

highp vec4 gammaCorrect(vec4 linear)
{
    return pow(linear, vec4(1.0 / 2.2));
}

void main(void)
{
    // Normal map
    vec3 normalMap = texture2D(UTextureNormal, VVertexTexCoord).rgb;
    vec3 TanNormalDir = normalize(normalMap * 2.0 - 1.0);

    // Add environment mapping.
    vec3 EnvMapR = reflect(VEnvMapI, VEnvMapN);
    vec4 ColorEnvMap = textureCube(USamplerCube, EnvMapR);

    // Calculate the color/intensities of each respective light.
    vec4 ColorAmbient, ColorDiffuse, ColorSpecular, VColor;

    // Gamma uncorrect
    vec4 ColorBase = gammaDecode(texture2D(UTextureBaseColor, VVertexTexCoord));

    // Ambient light.
    ColorAmbient = ColorBase * 0.2;

    // Diffuse light.
    ColorDiffuse = max(dot(TanNormalDir, VTanLightDir), 0.0) * ColorBase * 0.55;

    // Specular light.
    ColorSpecular = vec4(0.0, 0.0, 0.0, 0.0);
    vec3 Halfway = normalize(VTanLightDir + VTanViewDir);
    ColorSpecular = pow(max(dot(TanNormalDir, Halfway), 0.0), 16.0) * vec4(1.0) * 0.25;
    ColorSpecular *= clamp(dot(VTanLightDir, TanNormalDir), 0.0, 1.0);

    // Add all the lights up.
    vec4 Color = vec4(0,0,0,1);
    Color = (ColorAmbient + ColorDiffuse + ColorSpecular);// * 0.9 + ColorEnvMap * 0.1;
    // Color = vec4(VTanLightDir, 1.0);

    Color = gammaCorrect(Color); // gamma correct
    Color.a = 1.0;

    gl_FragColor = Color;
}
