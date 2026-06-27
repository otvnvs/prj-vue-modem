/**
 * Computes Levenshtein edit distance and bit error counts for string alignment verification
 */
export function calculateValidationResults(expected, received) {
    if (!expected) return { charAccuracy: 100, bitErrors: 0 };
    if (!received) return { charAccuracy: 0, bitErrors: expected.length * 8 };

    const expectedLen = expected.length;
    const receivedLen = received.length;

    const matrix = Array.from({ length: expectedLen + 1 }, () => new Array(receivedLen + 1).fill(0));
    for (let i = 0; i <= expectedLen; i++) matrix[i] = i;
    for (let j = 0; j <= receivedLen; j++) matrix[j] = j;

    for (let i = 1; i <= expectedLen; i++) {
        for (let j = 1; j <= receivedLen; j++) {
            const cost = expected.charCodeAt(i - 1) === received.charCodeAt(j - 1) ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }

    const editDistance = matrix[expectedLen][receivedLen];
    const rawAccuracy = ((expectedLen - editDistance) / expectedLen) * 100;
    const charAccuracy = Math.max(0, Math.round(rawAccuracy));

    let totalBitErrors = 0;
    let i = expectedLen;
    let j = receivedLen;

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && matrix[i][j] === matrix[i - 1][j - 1] + (expected.charCodeAt(i - 1) === received.charCodeAt(j - 1) ? 0 : 1)) {
            const expChar = expected.charCodeAt(i - 1);
            const recChar = received.charCodeAt(j - 1);
            let bitwiseXor = expChar ^ recChar;
            while (bitwiseXor > 0) {
                if (bitwiseXor & 1) totalBitErrors++;
                bitwiseXor >>= 1;
            }
            i--; j--;
        } else if (i > 0 && (j === 0 || matrix[i][j] === matrix[i - 1][j] + 1)) {
            totalBitErrors += 8;
            i--;
        } else if (j > 0 && (i === 0 || matrix[i][j] === matrix[i][j - 1] + 1)) {
            totalBitErrors += 8;
            j--;
        }
    }

    return { charAccuracy, bitErrors: totalBitErrors };
}

