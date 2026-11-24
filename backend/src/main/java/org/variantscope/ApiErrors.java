package org.variantscope;
import org.springframework.web.bind.annotation.*;import org.springframework.http.*;import java.util.*;
@RestControllerAdvice public class ApiErrors {
 @ExceptionHandler(NoSuchElementException.class) ResponseEntity<?> missing(Exception e){return ResponseEntity.status(404).body(Map.of("message",e.getMessage()));}
 @ExceptionHandler({IllegalArgumentException.class,IllegalStateException.class,org.springframework.web.multipart.MaxUploadSizeExceededException.class}) ResponseEntity<?> invalid(Exception e){return ResponseEntity.badRequest().body(Map.of("message",Objects.toString(e.getMessage(),"请求错误")));}
 @ExceptionHandler(Exception.class) ResponseEntity<?> unknown(Exception e){return ResponseEntity.status(500).body(Map.of("message","请求失败，请检查服务日志或数据库连接"));}
}
