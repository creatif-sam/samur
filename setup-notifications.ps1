# Quick Setup Script for Push Notifications
# Run this in PowerShell to set up your environment

Write-Host "🔔 SamUr Push Notification Setup" -ForegroundColor Magenta
Write-Host "=================================" -ForegroundColor Magenta
Write-Host ""

# Check if .env.local already exists
if (Test-Path ".env.local") {
    Write-Host "⚠️  .env.local already exists!" -ForegroundColor Yellow
    $response = Read-Host "Do you want to backup and replace it? (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        Write-Host "Setup cancelled. Your existing .env.local is unchanged." -ForegroundColor Cyan
        exit
    }
    # Backup existing file
    Copy-Item ".env.local" ".env.local.backup"
    Write-Host "✅ Backed up to .env.local.backup" -ForegroundColor Green
}

# Copy the example file
if (Test-Path ".env.local.example") {
    Copy-Item ".env.local.example" ".env.local"
    Write-Host "✅ Created .env.local from template" -ForegroundColor Green
} else {
    Write-Host "❌ .env.local.example not found!" -ForegroundColor Red
    Write-Host "   Creating .env.local with VAPID keys..." -ForegroundColor Yellow
    
    # Create minimal .env.local
    @"
# Push Notification VAPID Keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BJfF9EznPDMXDaxjrubMuEJ25PaT04JL0FmrQvIGk4HR6IsHQyuSW-uYJMH8_kkJi4mWzhbrfiWEzMZ6lpPthXg
VAPID_PRIVATE_KEY=N8DGn6nQ2yQhRn-lmObwCy1iwaWka4422pVvNkYvQ2A

# Add your Supabase credentials here
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
"@ | Out-File -FilePath ".env.local" -Encoding UTF8
    
    Write-Host "✅ Created .env.local with VAPID keys" -ForegroundColor Green
}

Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Add your Supabase credentials to .env.local" -ForegroundColor White
Write-Host "2. Restart your dev server: npm run dev" -ForegroundColor White
Write-Host "3. Go to Profile page and click 'Enable Chimes & Alerts'" -ForegroundColor White
Write-Host "4. Test at: http://localhost:3000/protected/notifications-test" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Setup complete! Push notifications are ready to use." -ForegroundColor Green
Write-Host ""
Write-Host "📖 For detailed instructions, see NOTIFICATION_SETUP.md" -ForegroundColor Cyan
