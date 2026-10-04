#include "hashprobe.h"

#include <stdarg.h>
#include <stdlib.h>
#include <string.h>

static hp_suite suite;

/* The shared test generator only needs these three platform helpers. */
void *hp_alloc(size_t size) {
    void *memory = calloc(1, size ? size : 1);
    if (!memory) hp_fatal("Not enough memory for the test suite");
    return memory;
}

_Noreturn void hp_fatal(const char *format, ...) {
    va_list args;
    va_start(args, format);
    vfprintf(stderr, format, args);
    va_end(args);
    abort();
}

int hp_unhex(const char *hex, uint8_t *bytes, size_t length) {
    if (strlen(hex) != length * 2) return -1;
    for (size_t i = 0; i < length; i++) {
        unsigned byte = 0;
        for (size_t j = 0; j < 2; j++) {
            unsigned char c = (unsigned char)hex[i * 2 + j];
            unsigned nibble;
            if (c >= '0' && c <= '9') nibble = c - '0';
            else if (c >= 'a' && c <= 'f') nibble = c - 'a' + 10;
            else if (c >= 'A' && c <= 'F') nibble = c - 'A' + 10;
            else return -1;
            byte = (byte << 4) | nibble;
        }
        bytes[i] = (uint8_t)byte;
    }
    return 0;
}

int lab_build(uint32_t seed) {
    hp_suite_free(&suite);
    if (hp_self_test() != 0) return -1;
    const hp_options options = { .seed = seed, .random_cases = 32, .max_bytes = 4096 };
    hp_suite_build(&suite, &options);
    return (int)suite.count;
}

const uint8_t *lab_input(unsigned index) {
    return index < suite.count ? suite.cases[index].input : NULL;
}

size_t lab_length(unsigned index) {
    return index < suite.count ? suite.cases[index].length : 0;
}

const uint8_t *lab_expected(unsigned index) {
    return index < suite.count ? suite.cases[index].expected : NULL;
}

const char *lab_id(unsigned index) {
    return index < suite.count ? suite.cases[index].id : NULL;
}

const char *lab_category(unsigned index) {
    return index < suite.count ? suite.cases[index].category : NULL;
}

void lab_free(void) {
    hp_suite_free(&suite);
}
