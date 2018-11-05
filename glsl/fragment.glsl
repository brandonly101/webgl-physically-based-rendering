// Copyright 2015 Brandon Ly all rights reserved.
//
// Fragment shader.
//
precision highp float;

uniform vec4 UAmbientProduct;
uniform vec4 UDiffuseProduct;
uniform vec4 USpecularProduct;

uniform mat4 UMatMV;
uniform mat4 UMatNormal;

uniform samplerCube USamplerCube;

uniform sampler2D UTextureAlbedo;
uniform sampler2D UTextureNormal;

varying vec3 EnvMapI;
varying vec3 EnvMapN;
varying vec3 L, N, E;
varying vec3 VTextureCoordSkybox;
varying vec4 VColor;
varying vec2 VVertexTexCoord;

void main(void)
{
    vec4 normalMap = texture2D(UTextureNormal, VVertexTexCoord) * 2.0 - 1.0;
    // vec3 N = normalize((UMatNormal * normalMap).xyz);

    // Calculate the color/intensities of each respective light.
    vec4 ColorAmbient, ColorDiffuse, ColorSpecular, VColor;

    // Ambient light.
    ColorAmbient = texture2D(UTextureAlbedo, VVertexTexCoord) * 0.25;

    // Diffuse light.
    ColorDiffuse = max(dot(L, N), 0.0) * texture2D(UTextureAlbedo, VVertexTexCoord) * 0.5;

    // Specular light.
    ColorSpecular = vec4(0.0, 0.0, 0.0, 0.0);
    if (dot(E, N) > 0.0)
    {
        vec3 R = normalize(reflect(-L, N));
        ColorSpecular = max(pow(max(dot(E, R), 0.0), 20.0) * vec4(0.5, 0.5, 0.5, 1.0), 0.0);
    }

    // // Add all the lights up.
    VColor = (ColorAmbient + ColorDiffuse + ColorSpecular);
    VColor.a = 1.0;

    // Add environment mapping.
    vec3 EnvMapR = reflect(EnvMapI, EnvMapN);
    VColor = textureCube(USamplerCube, EnvMapR) * 0.25 + VColor * 0.75;
    VColor.a = 1.0;

    gl_FragColor = VColor;
}
