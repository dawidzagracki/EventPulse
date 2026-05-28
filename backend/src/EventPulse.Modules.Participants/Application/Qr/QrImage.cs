using QRCoder;

namespace EventPulse.Modules.Participants.Application.Qr;

/// <summary>Renders QR codes as PNG bytes (no System.Drawing dependency — works on Linux containers).</summary>
public static class QrImage
{
    public static byte[] GeneratePng(string content, int pixelsPerModule = 20)
    {
        using var generator = new QRCodeGenerator();
        using var data = generator.CreateQrCode(content, QRCodeGenerator.ECCLevel.Q);
        var png = new PngByteQRCode(data);
        return png.GetGraphic(pixelsPerModule);
    }
}
