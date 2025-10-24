package pe.com.ikaza.backend.service;
import pe.com.ikaza.backend.entity.Pedido;
import pe.com.ikaza.backend.entity.DetallePedido;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import java.time.format.DateTimeFormatter;

@Service
@Slf4j
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.name:TiendaApp}")
    private String appName;

    /**
     * Envía correo de confirmación de pedido.
     */
    public void enviarConfirmacionPedido(Pedido pedido, String emailUsuario) {
        try {
            log.info("Enviando confirmación de pedido {} a {}", 
                pedido.getNumeroPedido(), emailUsuario);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(emailUsuario);
            helper.setSubject("Confirmación de Pedido " + pedido.getNumeroPedido());
            
            String htmlContent = construirHtmlConfirmacion(pedido);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            
            log.info("Email de confirmación enviado exitosamente a {}", emailUsuario);

        } catch (Exception e) {
            log.error("Error al enviar email de confirmación", e);
            // No lanzar excepción para no afectar el flujo del pedido
        }
    }

    /**
     * Construye el HTML del correo de confirmación.
     */
    private String construirHtmlConfirmacion(Pedido pedido) {
        StringBuilder html = new StringBuilder();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

        html.append("<!DOCTYPE html>");
        html.append("<html><head><meta charset='UTF-8'></head><body>");
        html.append("<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>");
        
        // Header
        html.append("<div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;'>");
        html.append("<h1 style='margin: 0;'>¡Gracias por tu compra!</h1>");
        html.append("<p style='margin: 10px 0 0 0; font-size: 16px;'>").append(appName).append("</p>");
        html.append("</div>");

        // Información del pedido
        html.append("<div style='padding: 30px; background-color: #f8f9fa;'>");
        html.append("<h2 style='color: #333; margin-top: 0;'>Detalles del Pedido</h2>");
        html.append("<table style='width: 100%; border-collapse: collapse;'>");
        html.append("<tr><td style='padding: 10px 0; border-bottom: 1px solid #dee2e6;'><strong>Número de Pedido:</strong></td>");
        html.append("<td style='padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right;'>").append(pedido.getNumeroPedido()).append("</td></tr>");
        html.append("<tr><td style='padding: 10px 0; border-bottom: 1px solid #dee2e6;'><strong>Fecha:</strong></td>");
        html.append("<td style='padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right;'>").append(pedido.getFechaPedido().format(formatter)).append("</td></tr>");
        html.append("<tr><td style='padding: 10px 0; border-bottom: 1px solid #dee2e6;'><strong>Estado:</strong></td>");
        html.append("<td style='padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right;'><span style='background-color: #28a745; color: white; padding: 5px 10px; border-radius: 5px;'>").append(pedido.getEstado()).append("</span></td></tr>");
        html.append("</table>");
        html.append("</div>");

        // Productos
        html.append("<div style='padding: 30px; background-color: white;'>");
        html.append("<h3 style='color: #333; margin-top: 0;'>Productos</h3>");
        html.append("<table style='width: 100%; border-collapse: collapse;'>");
        html.append("<thead><tr style='background-color: #f8f9fa;'>");
        html.append("<th style='padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;'>Producto</th>");
        html.append("<th style='padding: 10px; text-align: center; border-bottom: 2px solid #dee2e6;'>Cantidad</th>");
        html.append("<th style='padding: 10px; text-align: right; border-bottom: 2px solid #dee2e6;'>Precio</th>");
        html.append("<th style='padding: 10px; text-align: right; border-bottom: 2px solid #dee2e6;'>Subtotal</th>");
        html.append("</tr></thead><tbody>");

        for (DetallePedido detalle : pedido.getDetalles()) {
            html.append("<tr>");
            html.append("<td style='padding: 10px; border-bottom: 1px solid #dee2e6;'>").append(detalle.getProducto().getNombreProducto());
            if (detalle.getColorSeleccionado() != null || detalle.getTallaSeleccionada() != null) {
                html.append("<br><small style='color: #6c757d;'>");
                if (detalle.getColorSeleccionado() != null) html.append(detalle.getColorSeleccionado());
                if (detalle.getTallaSeleccionada() != null) html.append(" - ").append(detalle.getTallaSeleccionada());
                html.append("</small>");
            }
            html.append("</td>");
            html.append("<td style='padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6;'>").append(detalle.getCantidad()).append("</td>");
            html.append("<td style='padding: 10px; text-align: right; border-bottom: 1px solid #dee2e6;'>S/ ").append(String.format("%.2f", detalle.getPrecioUnitario())).append("</td>");
            html.append("<td style='padding: 10px; text-align: right; border-bottom: 1px solid #dee2e6;'>S/ ").append(String.format("%.2f", detalle.getSubtotal())).append("</td>");
            html.append("</tr>");
        }

        html.append("</tbody></table>");
        html.append("</div>");

        // Total
        html.append("<div style='padding: 30px; background-color: #f8f9fa; border-top: 3px solid #667eea;'>");
        html.append("<div style='text-align: right;'>");
        html.append("<h2 style='color: #333; margin: 0;'>Total: <span style='color: #28a745;'>S/ ").append(String.format("%.2f", pedido.getTotal())).append("</span></h2>");
        html.append("</div>");
        html.append("</div>");

        // Footer
        html.append("<div style='padding: 20px; text-align: center; background-color: #343a40; color: white;'>");
        html.append("<p style='margin: 0; font-size: 14px;'>Gracias por confiar en ").append(appName).append("</p>");
        html.append("<p style='margin: 10px 0 0 0; font-size: 12px; color: #adb5bd;'>Este es un correo automático, por favor no responder.</p>");
        html.append("</div>");

        html.append("</div></body></html>");

        return html.toString();
    }
}