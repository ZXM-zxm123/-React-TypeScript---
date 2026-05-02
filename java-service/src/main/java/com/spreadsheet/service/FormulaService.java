package com.spreadsheet.service;

import com.googlecode.aviator.AviatorEvaluator;
import com.googlecode.aviator.exception.ExpressionSyntaxErrorException;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class FormulaService {

    private static final Pattern CELL_REF_PATTERN = Pattern.compile("([A-Z]+)(\\d+)");
    private static final Pattern RANGE_PATTERN = Pattern.compile("([A-Z]+)(\\d+):([A-Z]+)(\\d+)");

    public double evaluate(String expression, Map<String, Object> cellValues) {
        if (expression == null || expression.isEmpty()) {
            return 0.0;
        }

        String formula = expression.trim();
        if (!formula.startsWith("=")) {
            try {
                return Double.parseDouble(formula);
            } catch (NumberFormatException e) {
                return 0.0;
            }
        }

        formula = formula.substring(1).trim();

        Map<String, Double> variables = resolveCellReferences(formula, cellValues);

        String aviatorExpr = convertToAviatorExpression(formula, variables);

        try {
            Object result = AviatorEvaluator.execute(aviatorExpr, variables);
            if (result instanceof Number) {
                return ((Number) result).doubleValue();
            }
            return 0.0;
        } catch (Exception e) {
            return evaluateWithFunctions(formula, cellValues);
        }
    }

    private Map<String, Double> resolveCellReferences(String formula, Map<String, Object> cellValues) {
        Map<String, Double> variables = new HashMap<>();

        Matcher rangeMatcher = RANGE_PATTERN.matcher(formula);
        StringBuffer sb = new StringBuffer();
        while (rangeMatcher.find()) {
            String startCol = rangeMatcher.group(1);
            int startRow = Integer.parseInt(rangeMatcher.group(2));
            String endCol = rangeMatcher.group(3);
            int endRow = Integer.parseInt(rangeMatcher.group(4));

            List<String> cells = expandRange(startCol, startRow, endCol, endRow);
            String varName = "_range_" + rangeMatcher.group(0).hashCode());
            double sum = 0;
            int count = 0;
            for (String cell : cells) {
                Object val = cellValues.get(cell);
                if (val != null) {
                    try {
                        double d = parseNumber(val);
                        sum += d;
                        count++;
                        variables.put(cell, d);
                    } catch (NumberFormatException ignored) {}
                }
            }
            if (count > 0) {
                variables.put(varName + "_sum", sum);
                variables.put(varName + "_count", (double) count);
                variables.put(varName + "_avg", sum / count);
                List<Double> allValues = cells.stream()
                    .map(c -> variables.getOrDefault(c, 0.0))
                    .collect(Collectors.toList());
                variables.put(varName + "_values", sum);
            }
            rangeMatcher.appendReplacement(sb, varName);
        }
        rangeMatcher.appendTail(sb);

        Matcher cellMatcher = CELL_REF_PATTERN.matcher(sb.toString());
        while (cellMatcher.find()) {
            String cellId = cellMatcher.group(1) + cellMatcher.group(2);
            if (!variables.containsKey(cellId)) {
                Object val = cellValues.get(cellId);
                if (val != null) {
                    try {
                        variables.put(cellId, parseNumber(val));
                    } catch (NumberFormatException ignored) {}
                }
            }
        }

        return variables;
    }

    private List<String> expandRange(String startCol, int startRow, String endCol, int endRow) {
        List<String> cells = new ArrayList<>();
        int startColNum = colToNum(startCol);
        int endColNum = colToNum(endCol);
        int minCol = Math.min(startColNum, endColNum);
        int maxCol = Math.max(startColNum, endColNum);
        int minRow = Math.min(startRow, endRow);
        int maxRow = Math.max(startRow, endRow);

        for (int col = minCol; col <= maxCol; col++) {
            for (int row = minRow; row <= maxRow; row++) {
                cells.add(numToCol(col) + row);
            }
        }
        return cells;
    }

    private int colToNum(String col) {
        int num = 0;
        for (char c : col.toCharArray()) {
            num = num * 26 + (c - 'A' + 1);
        }
        return num;
    }

    private String numToCol(int num) {
        StringBuilder col = new StringBuilder();
        while (num > 0) {
            int rem = (num - 1) % 26;
            col.insert(0, (char) ('A' + rem));
            num = (num - 1) / 26;
        }
        return col.toString();
    }

    private double parseNumber(Object val) {
        if (val instanceof Number) {
            return ((Number) val).doubleValue();
        }
        return Double.parseDouble(val.toString());
    }

    private String convertToAviatorExpression(String formula, Map<String, Double> variables) {
        String result = formula;

        Matcher cellMatcher = CELL_REF_PATTERN.matcher(result);
        StringBuffer sb = new StringBuffer();
        while (cellMatcher.find()) {
            String cellId = cellMatcher.group(1) + cellMatcher.group(2);
            if (variables.containsKey(cellId)) {
                cellMatcher.appendReplacement(sb, cellId);
            }
        }
        cellMatcher.appendTail(sb);
        result = sb.toString();

        result = result.replaceAll("(?i)SUM\\s*\\(", "sum(");
        result = result.replaceAll("(?i)AVG\\s*\\(", "avg(");
        result = result.replaceAll("(?i)MAX\\s*\\(", "max(");
        result = result.replaceAll("(?i)MIN\\s*\\(", "min(");
        result = result.replaceAll("(?i)COUNT\\s*\\(", "count(");

        return result;
    }

    private double evaluateWithFunctions(String formula, Map<String, Object> cellValues) {
        String upperFormula = formula.toUpperCase();

        if (upperFormula.startsWith("SUM(")) {
            return evaluateSum(formula.substring(4, formula.length() - 1), cellValues);
        } else if (upperFormula.startsWith("AVG(")) {
            return evaluateAvg(formula.substring(4, formula.length() - 1), cellValues);
        } else if (upperFormula.startsWith("MAX(")) {
            return evaluateMax(formula.substring(4, formula.length() - 1), cellValues);
        } else if (upperFormula.startsWith("MIN(")) {
            return evaluateMin(formula.substring(4, formula.length() - 1), cellValues);
        } else if (upperFormula.startsWith("COUNT(")) {
            return evaluateCount(formula.substring(6, formula.length() - 1), cellValues);
        }

        try {
            String aviatorExpr = convertToAviatorExpression(formula, new HashMap<>());
            Map<String, Double> vars = resolveCellReferences(formula, cellValues);
            Object result = AviatorEvaluator.execute(aviatorExpr, vars);
            return ((Number) result).doubleValue();
        } catch (Exception e) {
            return 0.0;
        }
    }

    private double evaluateSum(String args, Map<String, Object> cellValues) {
        List<Double> values = getValuesFromArgs(args, cellValues);
        return values.stream().mapToDouble(Double::doubleValue).sum();
    }

    private double evaluateAvg(String args, Map<String, Object> cellValues) {
        List<Double> values = getValuesFromArgs(args, cellValues);
        return values.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
    }

    private double evaluateMax(String args, Map<String, Object> cellValues) {
        List<Double> values = getValuesFromArgs(args, cellValues);
        return values.stream().mapToDouble(Double::doubleValue).max().orElse(0.0);
    }

    private double evaluateMin(String args, Map<String, Object> cellValues) {
        List<Double> values = getValuesFromArgs(args, cellValues);
        return values.stream().mapToDouble(Double::doubleValue).min().orElse(0.0);
    }

    private double evaluateCount(String args, Map<String, Object> cellValues) {
        List<Double> values = getValuesFromArgs(args, cellValues);
        return values.size();
    }

    private List<Double> getValuesFromArgs(String args, Map<String, Object> cellValues) {
        List<Double> values = new ArrayList<>();

        String[] parts = args.split(",");
        for (String part : parts) {
            part = part.trim();
            Matcher rangeMatcher = RANGE_PATTERN.matcher(part);
            if (rangeMatcher.matches()) {
                String startCol = rangeMatcher.group(1);
                int startRow = Integer.parseInt(rangeMatcher.group(2));
                String endCol = rangeMatcher.group(3);
                int endRow = Integer.parseInt(rangeMatcher.group(4));

                List<String> cells = expandRange(startCol, startRow, endCol, endRow);
                for (String cell : cells) {
                    Object val = cellValues.get(cell);
                    if (val != null) {
                        try {
                            values.add(parseNumber(val));
                        } catch (NumberFormatException ignored) {}
                    }
                }
            } else {
                Matcher cellMatcher = CELL_REF_PATTERN.matcher(part);
                if (cellMatcher.matches()) {
                    String cellId = cellMatcher.group(1) + cellMatcher.group(2);
                    Object val = cellValues.get(cellId);
                    if (val != null) {
                        try {
                            values.add(parseNumber(val));
                        } catch (NumberFormatException ignored) {}
                    }
                }
            }
        }

        return values;
    }
}
