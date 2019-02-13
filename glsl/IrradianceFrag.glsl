// Copyright 2015-2019 Brandon Ly all rights reserved.
//
// Irradiance fragment shader.
//
// Use Monte Carlo Integration over hemisphere of a normal to capture incoming radiance
// from environment map.
//
// Special thanks to MJP for thorough irradiance map calculation explanation
// (https://www.gamedev.net/forums/topic/691168-calculating-irradiance-map/)
//
precision highp float;

uniform samplerCube UTexCubeEnv;

varying vec3 VTextureCoordSkybox;

// Gamma decode and correct functions
highp vec4 gammaDecode(vec4 encoded) { return pow(encoded, vec4(2.2)); }
highp vec4 gammaCorrect(vec4 linear) { return pow(linear, vec4(1.0 / 2.2)); }

// Constants
const float PI = 3.1415927;

const int NUM_SQRT_IRRADIANCE_SAMPLE = 192;
const int NUM_SQRT_IRRADIANCE_SAMPLE_ITER = NUM_SQRT_IRRADIANCE_SAMPLE - 1;

const float NUM_SQRT_IRRADIANCE_SAMPLE_FLOAT = float(NUM_SQRT_IRRADIANCE_SAMPLE);
const float NUM_SQRT_IRRADIANCE_SAMPLE_ITER_FLOAT = float(NUM_SQRT_IRRADIANCE_SAMPLE_ITER);

void main(void)
{
    // Use uniformly-distributed points on hemisphere centered around normal.
    vec4 irradiance = vec4(0.0);

    // Create a TBN matrix. Tangent space is where Z+ is up.
    vec3 T = vec3(0.0, 0.0, 1.0);
    vec3 N = normalize(VTextureCoordSkybox);
    T = normalize(T - dot(N, T) * N);
    vec3 B = cross(N, T);
    mat3 TBN = mat3(T, B, N);

    for (int i = 0; i < NUM_SQRT_IRRADIANCE_SAMPLE; i++)
    {
        for (int j = 0; j < NUM_SQRT_IRRADIANCE_SAMPLE; j++)
        {
            // Create uniformly-distributed vector on hemisphere. Spherical coordinates follow
            // physics conventions. Integrate over theta and phi range of PI (i.e. a hemisphere).
            float phi = float(i) / NUM_SQRT_IRRADIANCE_SAMPLE_ITER_FLOAT * PI - PI / 2.0;
            float theta = float(j) / NUM_SQRT_IRRADIANCE_SAMPLE_ITER_FLOAT * PI;

            float x = sin(theta) * sin(phi);
            float y = cos(theta);
            float z = sin(theta) * cos(phi);
            vec3 tanHemiVector = vec3(x, y, z);

            // Transform vector into world space.
            vec3 worldHemiVector = normalize(TBN * tanHemiVector);

            // Sample raw environment map.
            vec4 radiance = gammaDecode(textureCube(UTexCubeEnv, worldHemiVector));
            irradiance += radiance * clamp(dot(worldHemiVector, N), 0.0, 1.0);
        }
    }

    // For uniform sampling the probability distribution function (PDF) is constant for all samples;
    // there is equal chance of any solid angle on the hemisphere being chosen. As such, the
    // hemisphere PDF is 1 / surface area (i.e. 1 / 2PI).
    float hemispherePDF = 1.0 / (2.0 * PI);
    irradiance /= (NUM_SQRT_IRRADIANCE_SAMPLE_FLOAT * NUM_SQRT_IRRADIANCE_SAMPLE_FLOAT * hemispherePDF);
    irradiance.a = 1.0;

    gl_FragColor = irradiance; // Output irradiance map in linear color space.
}
