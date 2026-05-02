package com.spreadsheet.controller;

import com.spreadsheet.service.FormulaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class FormulaController {

    @Autowired
    private FormulaService formulaService;

    @PostMapping("/evaluate")
    public ResponseEntity<Map<String, Object>> evaluate(@RequestBody EvaluateRequest request) {
        try {
            Map<String, Object> cellValues = request.getCells() != null ? request.getCells() : new HashMap<>();
            double result = formulaService.evaluate(request.getExpression(), cellValues);

            Map<String, Object> response = new HashMap<>();
            response.put("result", result);
            response.put("success", true);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            response.put("result", 0);
            return ResponseEntity.ok(response);
        }
    }

    public static class EvaluateRequest {
        private String expression;
        private Map<String, Object> cells;

        public String getExpression() {
            return expression;
        }

        public void setExpression(String expression) {
            this.expression = expression;
        }

        public Map<String, Object> getCells() {
            return cells;
        }

        public void setCells(Map<String, Object> cells) {
            this.cells = cells;
        }
    }
}
