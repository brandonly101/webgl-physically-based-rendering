// Copyright Brandon Ly 2015 all rights reserved.
// 
// A JavaScript WebGL and math, graphics, and matrix library for matrix and
// functions that I defined myself. This is, for the most part, for the
// purpose of me learning about 3D graphics and the math behind it.
//
// All matrix code should be in row-major format. Then, use transpose before
// inputting it into WebGL.

// 2 Vector, 3 Vector, 4 Vector, 3x3 Matrix, 4x4 Matrix

//
// Helper Functions
//
function degreesToRadians(rad) {
    return (rad * Math.PI / 180.0);
}

// Error checking
function GLMathLibException(error) {
    return "GLMathLib Error: " + error;
}

//
// The WebGL Math Library class, with all of its functions.
//
var GLMathLib = {

    // Create Vectors or Matrices
    vec3: function() {
        var args = Array.prototype.slice.call(arguments);
        if (args.length == 3) {
            return [args[0], args[1], args[2]];
        } else {
            return [0, 0, 0];
        }
    },

    vec4: function() {
        var args = Array.prototype.slice.call(arguments);
        if (args.length == 2) {
            return [args[0][0], args[0][1], args[0][2], args[1]];
        } else if (args.length == 4) {
            return [args[0], args[1], args[2], args[3]];
        } else {
            return [0, 0, 0, 0];
        }
    },

    mat3: function() {
        var args = Array.prototype.slice.call(arguments);
        if (args.length == 0) {
            return [
                0, 0, 0,
                0, 0, 0,
                0, 0, 0
            ];
        } else if (args.length == 1) {
            return [
                args[0], 0, 0,
                0, args[0], 0,
                0, 0, args[0]
            ];
        }
    },

    mat4: function() {
        var args = Array.prototype.slice.call(arguments);
        if (args.length == 0) {
            return [
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0
            ];
        } else if (args.length == 1) {
            return [
                args[0], 0, 0, 0,
                0, args[0], 0, 0,
                0, 0, args[0], 0,
                0, 0, 0, args[0]
            ];
        }
    },

    // Mathematical functions on vectors and matrices
    add: function(left, right) {
        if (left.length != right.length) {
            throw GLMathLibException("Cannot add vectors/matrices of different sizes!");
        }
        var result = new Array(length.left);
        for (i = 0; i < left.length; i++) {
            result[i] = left[i] + right[i];
        }
        return result;
    },

    sub: function(left, right) {
        if (left.length != right.length) {
            throw GLMathLibException("Cannot subtract vectors/matrices of different sizes!");
        }
        var result = new Array(length.left);
        for (i = 0; i < left.length; i++) {
            result[i] = left[i] - right[i];
        }
        return result;
    },

    mult: function(u, v) {
        var result;
        if (u.length == 3 && v.length == 3) {
            result = this.vec3(u[0]*v[0], u[1]*v[1], u[2]*v[2]);
        } else if (u.length == 4 && v.length == 4) {
            result = this.vec4(u[0]*v[0], u[1]*v[1], u[2]*v[2], u[3]*v[3]);
        } else if (u.length == 16 && v.length == 4) {
            result = this.vec4();
            for (i = 0; i < 4; i++) {
                result[i] = (
                    v[i]*u[i*4] +
                    v[i+1]*u[i*4+1] +
                    v[i+2]*u[i*4+2] +
                    v[i+3]*u[i*4+3]
                );
            }
        } else if (u.length == 16 && v.length == 16) {
            result = this.mat4();
            for (i = 0; i < 16; i += 4) {
                for (j = 0; j < 4; j++) {
                    result[i+j] = (
                        u[i+0]*v[0+j] +
                        u[i+1]*v[4+j] +
                        u[i+2]*v[8+j] +
                        u[i+3]*v[12+j]
                    );
                }
            }
        } else if (typeof u == 'number') {
            result = v;
            for (i = 0; i < v.length; i++) {
                result[i] = result[i] * u;
            }
        } else {
            throw GLMathLibException("Incompatible matrix/vector multiplication.");
        }
        return result;
    },

    dot: function(u, v) {
        var result = 0.0;
        for (i = 0; i < u.length; i++) {
            result = result + (u[i]*v[i]);
        };
        return Math.sqrt(result);
    },

    cross: function(u, v) {
        return this.vec3(
            u[1]*v[2] - u[2]*v[1],
            u[2]*v[0] - u[0]*v[2],
            u[0]*v[1] - u[1]*v[0]
        );
    },

    normalize: function(u) {
        var mag = this.dot(u, u);
        if (u.length == 3) {
            return this.vec3(u[0]/mag, u[1]/mag, u[2]/mag);
        } else if (vec.length == 4) {
            return this.vec4(u[0]/mag, u[1]/mag, u[2]/mag, u[3]/mag);
        }
    },

    mid: function(u, v) {
        result = [];
        if (u.length == 3) {
            return this.vec3(
                u[0]*0.5 + v[0]*0.5,
                u[1]*0.5 + v[1]*0.5,
                u[2]*0.5 + v[2]*0.5
            );
        } else if (vec.length == 4) {
            return this.vec4(
                u[0]*0.5 + v[0]*0.5,
                u[1]*0.5 + v[1]*0.5,
                u[2]*0.5 + v[2]*0.5,
                u[3]*0.5 + v[3]*0.5
            );
        }
    },

    // Invert the matrix.
    inverse: function(arg) {
        result = [];
        return result;
    },

    // Transpose the matrix.
    transpose: function(arg) {
        var result = [];
        var N = Math.sqrt(arg.length);
        var ii = 0;
        var jj = 0;
        for (i = 0; i < N; i++) {
            for (j = 0; j < N; j++) {
                result[ii+j] = arg[i+jj];
                jj += N;
            }
            ii += N;
            jj = 0;
        }
        return result;
    },

    // Transformation matrix functions that create transformation matrices.
    translate: function(input, vec) {
        var result = this.mat4(1.0);
        result[3] = vec[0];
        result[7] = vec[1];
        result[11] = vec[2];
        return this.mult(result, input);
    },

    scale: function(input, vec) {
        var result = this.mat4(1.0);
        result[0] = vec[0];
        result[5] = vec[1];
        result[10] = vec[2];
        return this.mult(result, input);
    },

    rotate: function(input, angle, vec) {
        var result = this.mat4(1.0);
        var rad = angle * Math.PI / 180.0;
        if (vec[0] == 1) {
            result[5] = Math.cos(rad);
            result[6] = -(Math.sin(rad));
            result[9] = Math.sin(rad);
            result[10] = Math.cos(rad);
        } else if (vec[1] == 1) {
            result[0] = Math.cos(rad);
            result[2] = Math.sin(rad);
            result[8] = -(Math.sin(rad));
            result[10] = Math.cos(rad);
        } else if (vec[2] == 1) {
            result[0] = Math.cos(rad);
            result[1] = -(Math.sin(rad));
            result[4] = Math.sin(rad);
            result[5] = Math.cos(rad);
        }
        return this.mult(result, input);
    },

    // Create a LookAt Matrix.
    lookAt: function(at, eye, up) {
        // Normalize the vector from 'at' to 'eye'
        var ateye = this.normalize(this.sub(at, eye));

        // Normalize 'up' vector
        var upn = this.normalize(up);

        // Find cross product of normalized 'at-eye' vector and 'up' vector
        var s = this.cross(ateye, upn);

        // Find cross product of 's' vector and normalized 'at-eye' vector
        var u = this.cross(s, ateye);

        // Construct the matrix.
        var matrix = this.mat4(1.0);
        matrix[0] = s[0];
        matrix[1] = s[1];
        matrix[2] = s[2];
        matrix[4] = u[0];
        matrix[5] = u[1];
        matrix[6] = u[2];
        matrix[8] = -ateye[0];
        matrix[9] = -ateye[1];
        matrix[10] = -ateye[2];

        // Translate the camera (or eye) from origin.
        var translate = this.translate(this.mat4(1), this.vec3(-eye[0], -eye[1], -eye[2]));

        // Multiply the two and return.
        return this.mult(translate, matrix);
    },

    // Create a perspective matrix, with the inputted parameters.
    perspective: function(yFOV, aspect, near, far) {
        // Make some mathematical and geometrical calculations.
        var top = Math.tan(yFOV * Math.PI / 360) * near;
        var bottom = -top;
        var left = -(aspect * top);
        var right = aspect * top;

        var f = 1.0 / Math.tan((yFOV * Math.PI / 180) / 2);

        // Create the matrix and return.
        var result = this.mat4();
        result[0] = f / aspect;
        result[5] = f;
        result[10] = -(far+near)/(far-near);
        result[11] = (-2*far*near)/(far-near);
        result[14] = -1;
        return result;
    },

    // Flatten - This idea is taken from Edward Angel. Matrices in this library
    // are formatted in row-major, but WebGL by default takes in column-major
    // (unless, I think, you set an array format flag with gl functions). This
    // takes row-major arrays and makes them column major (basically,
    // transposing them). Ideally only needs to be used with matrices.
    //
    // The truth about how it all works is really, really, complicated. If you're
    // new to this and happen to read this, just know that in summary, WebGL
    // (and therefore, OpenGL) and DirectX both take in matrices as arrays in
    // column-major format!
    flatten: function(arg) {
        var result = [];
        var N = Math.sqrt(arg.length);
        var ii = 0;
        var jj = 0;
        for (i = 0; i < N; i++) {
            for (j = 0; j < N; j++) {
                result[ii+j] = arg[i+jj];
                jj += N;
            }
            ii += N;
            jj = 0;
        }
        return result;
    },
}
