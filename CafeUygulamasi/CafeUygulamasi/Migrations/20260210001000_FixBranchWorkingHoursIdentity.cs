using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CafeUygulamasi.Migrations
{
    public partial class FixBranchWorkingHoursIdentity : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE `BranchWorkingHours` MODIFY COLUMN `Id` int NOT NULL AUTO_INCREMENT;");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE `BranchWorkingHours` MODIFY COLUMN `Id` int NOT NULL;");
        }
    }
}
