#version 300 es

// Copyright 2015 Brandon Ly all rights reserved.
//
// Vertex shader.
//

precision highp float;

// Vert shader attributes
in vec3 AVertexPosition;
in vec2 AVertexTexCoord;
in vec3 AVertexNormal;
in vec4 AVertexTangent;

// Uniforms
uniform vec4 ULightPosition;
uniform vec3 ULightDirectDir;
uniform vec4 UCamPosition;

uniform mat4 UMatModel;
uniform mat4 UMatView;
uniform mat4 UMatMV;
uniform mat4 UMatProj;
uniform mat4 UMatMVP;
uniform mat4 UMatNormal;

// Variables passed from vert to pixel
out vec3 VEnvMapI;
out vec3 VEnvMapN;

out vec3 VTextureCoordSkybox;
out vec2 VVertexTexCoord;

out vec3 VTanLightDir;
out vec3 VTanViewDir;

out mat3 VTBN;

void main(void)
{
    vec3 PosWorldSpace = vec3(UMatModel * vec4(AVertexPosition, 1.0));

    // Create the inverse TBN matrix (in world space as well)
    vec3 T = normalize(vec3(UMatModel * AVertexTangent));
    vec3 N = normalize(vec3(UMatModel * vec4(AVertexNormal, 0.0)));
    T = normalize(T - dot(N, T) * N);
    vec3 B = cross(N, T);
    B = B * AVertexTangent.w; // Correct for handedness

    VTBN = mat3(T, B, N);
    mat3 invTBN = transpose(VTBN);

    // Calculate the light dir and cam dir (in tangent space) to pass into the pixel shader.
    vec3 TanLightPos = invTBN * vec3(ULightPosition);
    vec3 TanViewPos = invTBN * vec3(UCamPosition);
    vec3 TanVertPos = invTBN * vec3(PosWorldSpace);

    // VTanLightDir = normalize(TanLightPos - TanVertPos);
    VTanLightDir = normalize(invTBN * ULightDirectDir); // Directional Light
    VTanViewDir = normalize(TanViewPos - TanVertPos);

    // Calculate environment mapping variables.
    VEnvMapI = normalize(PosWorldSpace - UCamPosition.xyz);
    VEnvMapN = N;

    VVertexTexCoord = AVertexTexCoord;

    gl_Position = UMatMVP * vec4(AVertexPosition, 1.0);
}
