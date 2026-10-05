package com.eclept.MessyNetBanking.chaos;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.json.JsonMapper;

/**
 * X-Mock-Scenario: drift. Renames the first field of the JSON object (or of every object in a bare array)
 * by appending "_v2": acc_no -> acc_no_v2, accountNumber -> accountNumber_v2, items -> items_v2, USER -> USER_v2.
 */
final class Drift {

    static final String SUFFIX = "_v2";

    private final JsonMapper mapper;

    Drift(JsonMapper mapper) {
        this.mapper = mapper;
    }

    byte[] apply(byte[] json) {
        Object tree = mapper.readerFor(Object.class)
                .with(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS)
                .readValue(json);
        Object drifted = switch (tree) {
            case Map<?, ?> map -> renameFirst(map);
            case List<?> list -> {
                List<Object> items = new ArrayList<>(list.size());
                for (Object item : list) {
                    items.add(item instanceof Map<?, ?> m ? renameFirst(m) : item);
                }
                yield items;
            }
            default -> tree;
        };
        return mapper.writeValueAsBytes(drifted);
    }

    private static Map<Object, Object> renameFirst(Map<?, ?> source) {
        Map<Object, Object> result = new LinkedHashMap<>();
        boolean first = true;
        for (Map.Entry<?, ?> entry : source.entrySet()) {
            result.put(first ? entry.getKey() + SUFFIX : entry.getKey(), entry.getValue());
            first = false;
        }
        return result;
    }
}
