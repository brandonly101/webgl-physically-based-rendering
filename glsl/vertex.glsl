// Copyright 2015 Brandon Ly all rights reserved.
//
// Vertex shader.
//

precision highp float;

// Vert shader attributes
attribute vec3 AVertexPosition;
attribute vec2 AVertexTexCoord;
attribute vec3 AVertexNormal;
attribute vec3 AVertexTangent;

// Uniforms
uniform vec4 ULightPosition;
uniform vec4 UCamPosition;

uniform mat4 UMatModel;
uniform mat4 UMatView;
uniform mat4 UMatMV;
uniform mat4 UMatProj;
uniform mat4 UMatMVP;
uniform mat4 UMatNormal;

// Variables passed from vert to pixel
varying vec3 VEnvMapI;
varying vec3 VEnvMapN;

varying vec3 VTextureCoordSkybox;
varying vec2 VVertexTexCoord;

varying vec3 VTanLightDir;
varying vec3 VTanCamDir;

// Utility function for transposing mat3, since WebGL GLSL does not support transpose()
highp mat3 transpose(in highp mat3 inMatrix)
{
    highp vec3 i0 = inMatrix[0];
    highp vec3 i1 = inMatrix[1];
    highp vec3 i2 = inMatrix[2];

    highp mat3 outMatrix = mat3(
        vec3(i0.x, i1.x, i2.x),
        vec3(i0.y, i1.y, i2.y),
        vec3(i0.z, i1.z, i2.z)
    );

    return outMatrix;
}

void main(void)
{
    // Create the inverse TBN matrix (in view space as well)
    vec3 TViewSpace = normalize(vec3(UMatNormal * vec4(AVertexTangent, 0.0)));
    vec3 NViewSpace = normalize(vec3(UMatNormal * vec4(AVertexNormal, 0.0)));
    TViewSpace = normalize(TViewSpace - dot(TViewSpace, NViewSpace) * NViewSpace);
    vec3 BViewSpace = cross(TViewSpace, NViewSpace);
    mat3 TBN = mat3(TViewSpace, BViewSpace, NViewSpace);
    mat3 invTBN = transpose(TBN);

    // Calculate the light dir and cam dir (in tangent space) to pass into the pixel shader.
    vec3 TanLightPos = invTBN * vec3(UMatView * ULightPosition);
    vec3 TanCamPos = invTBN * vec3(UMatView * UCamPosition);
    vec3 TanVertPos = invTBN * vec3(UMatMV * vec4(AVertexPosition, 0.0));

    VTanLightDir = normalize(TanLightPos - TanVertPos);
    VTanCamDir = normalize(TanCamPos - TanVertPos);

    // Calculate environment mapping variables.
    vec3 PosWorldSpace = (UMatModel * vec4(AVertexPosition, 1.0)).xyz;
    VEnvMapI = normalize(PosWorldSpace - UCamPosition.xyz);
    VEnvMapN = normalize(AVertexNormal);

    VVertexTexCoord = AVertexTexCoord;

    gl_Position = UMatMVP * vec4(AVertexPosition, 1.0);
}
