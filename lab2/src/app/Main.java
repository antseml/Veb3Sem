package app;

import com.fastcgi.FCGIInterface;

import java.io.IOException;
import java.io.OutputStream;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;

public final class Main {
    private static final List<Result> HISTORY = new ArrayList<Result>();
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ISO_OFFSET_DATE_TIME;
    private static final double EPSILON = 1e-9;

    private Main() {
    }

    public static void main(String[] args) {
        FCGIInterface fcgi = new FCGIInterface();
        while (fcgi.FCGIaccept() >= 0) {
            handleRequest();
        }
    }

    private static void handleRequest() {
        long startedAt = System.nanoTime();

        try {
            Properties environment = FCGIInterface.request.params;
            String method = environment.getProperty("REQUEST_METHOD", "");
            String query = environment.getProperty("QUERY_STRING", "");

            if (!"GET".equalsIgnoreCase(method.trim())) {
                sendJson(405, "Method Not Allowed",
                        errorJson("Поддерживается только метод GET."));
                return;
            }

            Map<String, String> params = parseQuery(query);
            if (params.containsKey("history")) {
                sendJson(200, "OK", historyJson());
                return;
            }

            double x = requiredNumber(params, "x", "X");
            double y = requiredNumber(params, "y", "Y");
            double r = requiredNumber(params, "r", "R");
            validateValues(x, y, r);

            boolean hit = AreaChecker.isHit(x, y, r);
            long executionTimeNs = System.nanoTime() - startedAt;
            Result result = new Result(
                    x,
                    y,
                    r,
                    hit,
                    OffsetDateTime.now().format(TIME_FORMAT),
                    executionTimeNs
            );

            synchronized (HISTORY) {
                HISTORY.add(result);
            }
            sendJson(200, "OK", successJson(result));
        } catch (IllegalArgumentException exception) {
            sendJson(400, "Bad Request", errorJson(exception.getMessage()));
        } catch (Exception exception) {
            exception.printStackTrace(System.err);
            sendJson(500, "Internal Server Error",
                    errorJson("Внутренняя ошибка сервера."));
        }
    }

    private static Map<String, String> parseQuery(String query) {
        Map<String, String> params = new HashMap<String, String>();
        if (query == null || query.trim().isEmpty()) {
            return params;
        }

        String[] pairs = query.split("&");
        for (String pair : pairs) {
            if (pair.isEmpty()) {
                continue;
            }
            int separator = pair.indexOf('=');
            String rawKey = separator < 0 ? pair : pair.substring(0, separator);
            String rawValue = separator < 0 ? "" : pair.substring(separator + 1);
            try {
                String key = URLDecoder.decode(rawKey, "UTF-8");
                String value = URLDecoder.decode(rawValue, "UTF-8");
                params.put(key, value);
            } catch (Exception exception) {
                throw new IllegalArgumentException("Некорректная строка запроса.");
            }
        }
        return params;
    }

    private static double requiredNumber(
            Map<String, String> params,
            String key,
            String displayName
    ) {
        String raw = params.get(key);
        if (raw == null || raw.trim().isEmpty()) {
            throw new IllegalArgumentException(
                    "Параметр " + displayName + " обязателен."
            );
        }

        try {
            double value = Double.parseDouble(raw.trim().replace(',', '.'));
            if (!Double.isFinite(value)) {
                throw new NumberFormatException();
            }
            return value;
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException(
                    "Параметр " + displayName + " должен быть числом."
            );
        }
    }

    private static void validateValues(double x, double y, double r) {
        if (x < -3.0 || x > 3.0) {
            throw new IllegalArgumentException(
                    "X должен находиться в диапазоне [-3; 3]."
            );
        }
        if (Math.abs(y - Math.rint(y)) > EPSILON || y < -3.0 || y > 5.0) {
            throw new IllegalArgumentException(
                    "Y должен быть одним из значений -3, -2, -1, 0, 1, 2, 3, 4, 5."
            );
        }
        if (!isAllowedR(r)) {
            throw new IllegalArgumentException(
                    "R должен быть одним из значений 1, 1.5, 2, 2.5, 3."
            );
        }
    }

    private static boolean isAllowedR(double r) {
        double[] allowed = {1.0, 1.5, 2.0, 2.5, 3.0};
        for (double value : allowed) {
            if (Math.abs(r - value) <= EPSILON) {
                return true;
            }
        }
        return false;
    }

    private static String successJson(Result current) {
        StringBuilder json = new StringBuilder();
        json.append("{\"status\":\"ok\",\"point\":");
        json.append(current.toJson());
        json.append(",\"history\":[");
        appendHistory(json);
        json.append("]}");
        return json.toString();
    }

    private static String historyJson() {
        StringBuilder json = new StringBuilder();
        json.append("{\"status\":\"ok\",\"history\":[");
        appendHistory(json);
        json.append("]}");
        return json.toString();
    }

    private static void appendHistory(StringBuilder json) {
        synchronized (HISTORY) {
            for (int i = 0; i < HISTORY.size(); i++) {
                if (i > 0) {
                    json.append(',');
                }
                json.append(HISTORY.get(i).toJson());
            }
        }
    }

    private static String errorJson(String message) {
        return "{\"status\":\"error\",\"message\":"
                + jsonString(message)
                + "}";
    }

    private static String jsonString(String value) {
        if (value == null) {
            return "null";
        }
        StringBuilder escaped = new StringBuilder("\"");
        for (int i = 0; i < value.length(); i++) {
            char symbol = value.charAt(i);
            switch (symbol) {
                case '\\':
                    escaped.append("\\\\");
                    break;
                case '"':
                    escaped.append("\\\"");
                    break;
                case '\n':
                    escaped.append("\\n");
                    break;
                case '\r':
                    escaped.append("\\r");
                    break;
                case '\t':
                    escaped.append("\\t");
                    break;
                default:
                    if (symbol < 32) {
                        escaped.append(String.format("\\u%04x", (int) symbol));
                    } else {
                        escaped.append(symbol);
                    }
            }
        }
        return escaped.append('"').toString();
    }

    private static void sendJson(int status, String reason, String body) {
        byte[] bodyBytes = body.getBytes(StandardCharsets.UTF_8);
        String headers = "HTTP/1.1 " + status + " " + reason + "\r\n"
                + "Content-Type: application/json; charset=UTF-8\r\n"
                + "Content-Length: " + bodyBytes.length + "\r\n"
                + "Cache-Control: no-store\r\n"
                + "\r\n";

        try {
            OutputStream output = FCGIInterface.request.outStream;
            output.write(headers.getBytes(StandardCharsets.UTF_8));
            output.write(bodyBytes);
            output.flush();
        } catch (IOException exception) {
            throw new RuntimeException("Не удалось отправить ответ.", exception);
        }
    }

    private static final class Result {
        private final double x;
        private final double y;
        private final double r;
        private final boolean hit;
        private final String serverTime;
        private final long executionTimeNs;

        private Result(
                double x,
                double y,
                double r,
                boolean hit,
                String serverTime,
                long executionTimeNs
        ) {
            this.x = x;
            this.y = y;
            this.r = r;
            this.hit = hit;
            this.serverTime = serverTime;
            this.executionTimeNs = executionTimeNs;
        }

        private String toJson() {
            return "{\"x\":" + x
                    + ",\"y\":" + y
                    + ",\"r\":" + r
                    + ",\"hit\":" + hit
                    + ",\"serverTime\":" + jsonString(serverTime)
                    + ",\"executionTimeNs\":" + executionTimeNs
                    + "}";
        }
    }
}
