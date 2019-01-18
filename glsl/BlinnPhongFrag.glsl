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

uniform sampler2D UTextureAlbedo;
uniform sampler2D UTextureNormal;

// Variables passed from vert to pixel
varying vec3 VEnvMapI;
varying vec3 VEnvMapN;

varying vec3 VTextureCoordSkybox;
varying vec4 VColor;
varying vec2 VVertexTexCoord;

varying vec3 VTanLightDir;
varying vec3 VTanViewDir;

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

    // Ambient light.
    ColorAmbient = texture2D(UTextureAlbedo, VVertexTexCoord) * 0.35;

    // Diffuse light.
    ColorDiffuse = max(dot(TanNormalDir, VTanLightDir), 0.0) * texture2D(UTextureAlbedo, VVertexTexCoord) * 1.0;

    // Specular light.
    ColorSpecular = vec4(0.0, 0.0, 0.0, 0.0);
    if (dot(VTanViewDir, TanNormalDir) > 0.0)
    {
        vec3 Halfway = normalize(VTanLightDir + VTanViewDir);
        ColorSpecular = pow(max((dot(TanNormalDir, Halfway)), 0.0), 20.0) * vec4(1.0, 1.0, 1.0, 1.0) * 0.650;
        ColorSpecular = max(ColorSpecular, 0.0);
    }

    // Add all the lights up.
    VColor = (ColorAmbient + ColorDiffuse + ColorSpecular) * 0.9 + ColorEnvMap * 0.1;
    // VColor = ColorEnvMap;
    VColor.a = 1.0;

    // float gamma = 2.2;
    // VColor.rgb = pow(VColor.rgb, vec3(1.0/gamma));

    gl_FragColor = VColor;
}
